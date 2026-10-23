import SwiftUI
import SwiftData

@main
struct BodyTrackerApp: App {
    var body: some Scene {
        WindowGroup {
            TabView {
                DashboardView()
                    .tabItem { Label("Прогресс", systemImage: "chart.xyaxis.line") }
                HistoryView()
                    .tabItem { Label("Замеры", systemImage: "list.bullet") }
                PhotosView()
                    .tabItem { Label("Фото", systemImage: "photo.on.rectangle") }
            }
            .tint(.primary)
        }
        .modelContainer(for: [Entry.self, EntryPhoto.self])
    }
}
