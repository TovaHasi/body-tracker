import SwiftUI
import SwiftData

struct HistoryView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Entry.date, order: .reverse) private var entries: [Entry]
    @State private var editing: Entry?
    @State private var showingNew = false

    var body: some View {
        NavigationStack {
            Group {
                if entries.isEmpty {
                    ContentUnavailableView(
                        "Нет замеров",
                        systemImage: "list.bullet",
                        description: Text("Нажми +, чтобы добавить первый")
                    )
                } else {
                    List {
                        ForEach(entries) { entry in
                            Button { editing = entry } label: { EntryRow(entry: entry) }
                                .foregroundStyle(.primary)
                        }
                        .onDelete { offsets in
                            let toDelete = offsets.map { entries[$0] }
                            toDelete.forEach { context.delete($0) }
                            try? context.save()
                        }
                    }
                }
            }
            .navigationTitle("Замеры")
            .toolbar {
                Button { showingNew = true } label: { Image(systemName: "plus") }
            }
            .sheet(item: $editing) { EntryEditView(entry: $0) }
            .sheet(isPresented: $showingNew) { EntryEditView(entry: nil) }
        }
    }
}

private struct EntryRow: View {
    let entry: Entry

    private var summary: String {
        Metric.allCases
            .compactMap { metric in entry[metric].map { "\(metric.title.lowercased()) \($0.short)" } }
            .joined(separator: " · ")
    }

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.date, format: .dateTime.day().month(.wide).year())
                    .font(.headline)
                if !summary.isEmpty {
                    Text(summary)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }
            Spacer()
            if let photo = entry.sortedPhotos.first {
                PhotoThumb(photo: photo)
                    .frame(width: 44, height: 58)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            }
        }
        .padding(.vertical, 2)
    }
}
