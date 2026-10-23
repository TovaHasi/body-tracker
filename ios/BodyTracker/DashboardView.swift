import SwiftUI
import SwiftData
import Charts

struct DashboardView: View {
    @Query(sort: \Entry.date) private var entries: [Entry]
    @State private var showingNew = false

    private var activeMetrics: [Metric] {
        Metric.allCases.filter { metric in entries.contains { $0[metric] != nil } }
    }

    var body: some View {
        NavigationStack {
            Group {
                if activeMetrics.isEmpty {
                    ContentUnavailableView(
                        "Нет замеров",
                        systemImage: "ruler",
                        description: Text("Нажми +, чтобы добавить первый")
                    )
                } else {
                    List(activeMetrics) { metric in
                        NavigationLink(value: metric) {
                            MetricRow(metric: metric, points: entries.points(for: metric))
                        }
                    }
                }
            }
            .navigationTitle("Прогресс")
            .navigationDestination(for: Metric.self) { MetricDetailView(metric: $0) }
            .toolbar {
                Button { showingNew = true } label: { Image(systemName: "plus") }
            }
            .sheet(isPresented: $showingNew) { EntryEditView(entry: nil) }
        }
    }
}

private struct MetricRow: View {
    let metric: Metric
    let points: [MetricPoint]

    private var delta: Double? {
        guard points.count > 1, let first = points.first, let last = points.last else { return nil }
        return last.value - first.value
    }

    var body: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 2) {
                Text(metric.title)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if let last = points.last {
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(last.value.short)
                            .font(.title2.weight(.semibold))
                            .monospacedDigit()
                        Text(metric.unit)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                if let delta {
                    Text("\(delta.signed) \(metric.unit) с начала")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }
            }
            Spacer()
            if points.count > 1 {
                Sparkline(points: points)
                    .frame(width: 90, height: 36)
            }
        }
        .padding(.vertical, 4)
    }
}

private struct Sparkline: View {
    let points: [MetricPoint]

    var body: some View {
        Chart(points) { point in
            LineMark(x: .value("Дата", point.date), y: .value("Значение", point.value))
                .interpolationMethod(.catmullRom)
                .foregroundStyle(Color.primary)
        }
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartYScale(domain: paddedDomain(points.map(\.value)))
    }
}
