import SwiftUI
import SwiftData
import PhotosUI

private struct PhotoDraft: Identifiable {
    let id = UUID()
    var existing: EntryPhoto?
    var data: Data
    var thumbData: Data?
    var thumbnail: UIImage?
}

struct EntryEditView: View {
    let entry: Entry?

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Entry.date, order: .reverse) private var allEntries: [Entry]

    @State private var date = Date.now
    @State private var values: [Metric: String] = [:]
    @State private var note = ""
    @State private var photos: [PhotoDraft] = []
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var showingCamera = false
    @State private var confirmDelete = false
    @State private var loaded = false
    @FocusState private var focused: Metric?

    /// Most recent other entry — its values are shown as placeholders.
    private var previous: Entry? {
        allEntries.first { $0.persistentModelID != entry?.persistentModelID }
    }

    private var canSave: Bool {
        !photos.isEmpty || Metric.allCases.contains { parseNumber(values[$0]) != nil }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker("Дата", selection: $date, displayedComponents: .date)
                }

                Section("Замеры") {
                    ForEach(Metric.allCases) { metricField($0) }
                }

                Section("Фото") {
                    if !photos.isEmpty { photoStrip }
                    PhotosPicker(selection: $pickerItems, matching: .images) {
                        Label("Из галереи", systemImage: "photo")
                    }
                    if UIImagePickerController.isSourceTypeAvailable(.camera) {
                        Button { showingCamera = true } label: {
                            Label("Камера", systemImage: "camera")
                        }
                    }
                }

                Section("Заметка") {
                    TextField("Необязательно", text: $note, axis: .vertical)
                }

                if entry != nil {
                    Section {
                        Button("Удалить замер", role: .destructive) { confirmDelete = true }
                    }
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle(entry == nil ? "Новый замер" : "Замер")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить", action: save).disabled(!canSave)
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Готово") { focused = nil }
                }
            }
            .onAppear(perform: load)
            .onChange(of: pickerItems) {
                Task { await loadPicked() }
            }
            .fullScreenCover(isPresented: $showingCamera) {
                CameraPicker { image in
                    Task { await add { ImageProcessing.prepare(image) } }
                }
                .ignoresSafeArea()
            }
            .confirmationDialog("Удалить этот замер?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Удалить", role: .destructive, action: delete)
            }
        }
    }

    private func metricField(_ metric: Metric) -> some View {
        HStack {
            Text(metric.title)
            Spacer()
            TextField(
                previous?[metric]?.short ?? "—",
                text: Binding(get: { values[metric] ?? "" }, set: { values[metric] = $0 })
            )
            .keyboardType(.decimalPad)
            .multilineTextAlignment(.trailing)
            .monospacedDigit()
            .focused($focused, equals: metric)
            .frame(maxWidth: 100)
            Text(metric.unit)
                .foregroundStyle(.secondary)
                .frame(width: 24, alignment: .leading)
        }
    }

    private var photoStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(photos) { draft in
                    Group {
                        if let thumbnail = draft.thumbnail {
                            Image(uiImage: thumbnail).resizable().scaledToFill()
                        } else {
                            Color.secondary.opacity(0.2)
                        }
                    }
                    .frame(width: 84, height: 112)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(alignment: .topTrailing) {
                        Button {
                            photos.removeAll { $0.id == draft.id }
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .symbolRenderingMode(.palette)
                                .foregroundStyle(.white, .black.opacity(0.6))
                                .font(.title3)
                        }
                        .buttonStyle(.borderless)
                        .padding(4)
                    }
                }
            }
        }
        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
    }

    private func load() {
        guard !loaded else { return }
        loaded = true
        guard let entry else { return }
        date = entry.date
        note = entry.note
        for metric in Metric.allCases {
            if let value = entry[metric] { values[metric] = value.editable }
        }
        photos = entry.sortedPhotos.map { photo in
            PhotoDraft(
                existing: photo,
                data: photo.data,
                thumbData: photo.thumbnail,
                thumbnail: UIImage(data: photo.thumbnail ?? photo.data)
            )
        }
    }

    private func loadPicked() async {
        let items = pickerItems
        guard !items.isEmpty else { return }
        pickerItems = []
        for item in items {
            guard let data = try? await item.loadTransferable(type: Data.self) else { continue }
            await add { ImageProcessing.prepare(data) }
        }
    }

    private func add(_ work: @escaping @Sendable () -> ProcessedImage?) async {
        guard let result = await Task.detached(operation: work).value else { return }
        photos.append(PhotoDraft(
            data: result.full,
            thumbData: result.thumb,
            thumbnail: UIImage(data: result.thumb)
        ))
    }

    private func save() {
        let target: Entry
        if let entry {
            target = entry
        } else {
            target = Entry(date: date)
            context.insert(target)
        }

        target.date = date
        target.note = note.trimmingCharacters(in: .whitespacesAndNewlines)
        for metric in Metric.allCases {
            target[metric] = parseNumber(values[metric])
        }

        let kept = Set(photos.compactMap { $0.existing?.persistentModelID })
        let removed = target.photos.filter { !kept.contains($0.persistentModelID) }
        target.photos.removeAll { !kept.contains($0.persistentModelID) }
        removed.forEach { context.delete($0) }

        for draft in photos where draft.existing == nil {
            let photo = EntryPhoto(data: draft.data, thumbnail: draft.thumbData)
            context.insert(photo)
            target.photos.append(photo)
        }

        try? context.save()
        dismiss()
    }

    private func delete() {
        if let entry {
            context.delete(entry)
            try? context.save()
        }
        dismiss()
    }
}
