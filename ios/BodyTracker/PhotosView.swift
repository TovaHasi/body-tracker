import SwiftUI
import SwiftData

struct PhotosView: View {
    @Query(sort: \Entry.date, order: .reverse) private var entries: [Entry]
    @State private var viewerStart: EntryPhoto?
    @State private var showingCompare = false

    private let columns = [GridItem(.adaptive(minimum: 100), spacing: 2)]

    private var withPhotos: [Entry] { entries.filter { !$0.photos.isEmpty } }
    /// Newest first, matching the grid.
    private var allPhotos: [EntryPhoto] { withPhotos.flatMap(\.sortedPhotos) }

    var body: some View {
        NavigationStack {
            Group {
                if withPhotos.isEmpty {
                    ContentUnavailableView(
                        "Нет фото",
                        systemImage: "photo",
                        description: Text("Прикрепляй фото к замерам, чтобы видеть изменения")
                    )
                } else {
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 20) {
                            ForEach(withPhotos) { entry in
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(entry.date, format: .dateTime.day().month(.wide).year())
                                        .font(.subheadline.weight(.medium))
                                        .padding(.horizontal)
                                    LazyVGrid(columns: columns, spacing: 2) {
                                        ForEach(entry.sortedPhotos) { photo in
                                            Button { viewerStart = photo } label: {
                                                Color.clear
                                                    .aspectRatio(3 / 4, contentMode: .fit)
                                                    .overlay { PhotoThumb(photo: photo) }
                                                    .clipped()
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        .padding(.vertical)
                    }
                }
            }
            .navigationTitle("Фото")
            .toolbar {
                if allPhotos.count > 1 {
                    Button("Сравнить") { showingCompare = true }
                }
            }
            .fullScreenCover(item: $viewerStart) { PhotoViewer(photos: allPhotos, start: $0) }
            .fullScreenCover(isPresented: $showingCompare) { CompareView(photos: allPhotos.reversed()) }
        }
    }
}

struct PhotoThumb: View {
    let photo: EntryPhoto

    var body: some View {
        if let image = UIImage(data: photo.thumbnail ?? photo.data) {
            Image(uiImage: image).resizable().scaledToFill()
        } else {
            Color.secondary.opacity(0.2)
        }
    }
}

private struct FullPhoto: View {
    let photo: EntryPhoto

    var body: some View {
        if let image = UIImage(data: photo.data) {
            Image(uiImage: image).resizable().scaledToFit()
        } else {
            Color.clear
        }
    }
}

private struct CloseButton: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Button { dismiss() } label: {
            Image(systemName: "xmark")
                .font(.body.weight(.semibold))
                .foregroundStyle(.white)
                .padding(12)
                .background(.white.opacity(0.15), in: Circle())
        }
        .padding()
    }
}

private struct PhotoViewer: View {
    let photos: [EntryPhoto]
    @State private var selection: PersistentIdentifier

    init(photos: [EntryPhoto], start: EntryPhoto) {
        self.photos = photos
        _selection = State(initialValue: start.persistentModelID)
    }

    private var current: EntryPhoto? { photos.first { $0.persistentModelID == selection } }

    var body: some View {
        TabView(selection: $selection) {
            ForEach(photos) { photo in
                FullPhoto(photo: photo).tag(photo.persistentModelID)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .background(Color.black.ignoresSafeArea())
        .overlay(alignment: .topTrailing) { CloseButton() }
        .overlay(alignment: .bottom) {
            if let date = current?.entry?.date {
                Text(date, format: .dateTime.day().month(.wide).year())
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.8))
                    .padding()
            }
        }
    }
}

/// Two independently swipeable panes: oldest on the left, newest on the right.
private struct CompareView: View {
    let photos: [EntryPhoto]
    @State private var left: PersistentIdentifier?
    @State private var right: PersistentIdentifier?

    init(photos: [EntryPhoto]) {
        self.photos = photos
        _left = State(initialValue: photos.first?.persistentModelID)
        _right = State(initialValue: photos.last?.persistentModelID)
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                CloseButton()
            }
            HStack(spacing: 2) {
                pane($left)
                pane($right)
            }
            Text("Листай каждую половину")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.5))
                .padding()
        }
        .background(Color.black.ignoresSafeArea())
    }

    private func pane(_ selection: Binding<PersistentIdentifier?>) -> some View {
        TabView(selection: selection) {
            ForEach(photos) { photo in
                VStack(spacing: 8) {
                    FullPhoto(photo: photo)
                    if let date = photo.entry?.date {
                        Text(date, format: .dateTime.day().month().year())
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.8))
                    }
                }
                .tag(photo.persistentModelID as PersistentIdentifier?)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
    }
}
