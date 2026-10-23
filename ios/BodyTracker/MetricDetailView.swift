import SwiftUI
import SwiftData
import Charts

enum ChartRange: String, CaseIterable, Identifiable {
    case month = "1М", quarter = "3М", half = "6М", year = "1Г", all = "Всё"

    var id: Self { self }

    var start: Date? {
        let calendar = Calendar.current
        switch self {
        case .month: return calendar.date(byAdding: .month, value: -1, to: .now)
        case .quarter: return calendar.date(byAdding: .month, value: -3, to: .now)
        case .half: return calendar.date(byAdding: .month, value: -6, to: .now)
        case .year: return calendar.date(byAdding: .year, value: -1, to: .now)
        case .all: return nil
        }
    }
}

struct MetricDetailView: View {
    let metric: Metric

    @Query(sort: \Entry.date) private var entries: [Entry]
    @State private var range: ChartRange = .all
    @State private var selectedDate: Date?
    @State private var editing: Entry?

    private var allPoints: [MetricPoint] { entries.points(for: metric) }

    private var points: [MetricPoint] {
        guard let start = range.start else { return allPoints }
        return allPoints.filter { $0.date >= start }
    }

    private var selected: MetricPoint? {
        guard let selectedDate else { return nil }
        return points.min {
            abs($0.date.timeIntervalSince(selectedDate)) < abs($1.date.timeIntervalSince(selectedDate))
        }
    }

    private var change: Double? {
        guard points.count > 1, let first = points.first, let last = points.last else { return nil }
        return last.value - first.value
    }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    chart.frame(height: 220)
                    Picker("Период", selection: $range) {
                        ForEach(ChartRange.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }
                .padding(.vertical, 8)
            }

            Section("История") {
                ForEach(allPoints.reversed()) { point in
                    Button { editing = point.entry } label: {
                        HStack {
                            Text(point.date, format: .dateTime.day().month().year())
                            Spacer()
                            Text("\(point.value.short) \(metric.unit)")
                                .monospacedDigit()
                                .foregroundStyle(.secondary)
                        }
                    }
                    .foregroundStyle(.primary)
                }
            }
        }
        .navigationTitle(metric.title)
        .sheet(item: $editing) { EntryEditView(entry: $0) }
    }

    @ViewBuilder
    private var header: some View {
        let shown = selected ?? points.last
        VStack(alignment: .leading, spacing: 2) {
            if let shown {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(shown.value.short)
                        .font(.system(size: 40, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                    Text(metric.unit)
                        .foregroundStyle(.secondary)
                }
                Text(shown.date, format: .dateTime.day().month(.wide).year())
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            if selected == nil, let change {
                Text("\(change.signed) \(metric.unit) за период")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }
        }
    }

    @ViewBuilder
    private var chart: some View {
        if points.isEmpty {
            ContentUnavailableView("Нет данных за период", systemImage: "chart.xyaxis.line")
        } else {
            Chart {
                ForEach(points) { point in
                    LineMark(x: .value("Дата", point.date), y: .value(metric.title, point.value))
                        .interpolationMethod(.catmullRom)
                        .foregroundStyle(Color.primary)
                    PointMark(x: .value("Дата", point.date), y: .value(metric.title, point.value))
                        .foregroundStyle(Color.primary)
                        .symbolSize(points.count > 30 ? 0 : 24)
                }
                if let selected {
                    RuleMark(x: .value("Дата", selected.date))
                        .foregroundStyle(Color.secondary.opacity(0.4))
                    PointMark(x: .value("Дата", selected.date), y: .value(metric.title, selected.value))
                        .foregroundStyle(Color.primary)
                        .symbolSize(90)
                }
            }
            .chartYScale(domain: paddedDomain(points.map(\.value)))
            .chartXSelection(value: $selectedDate)
        }
    }
}
