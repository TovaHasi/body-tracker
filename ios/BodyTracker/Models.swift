import Foundation
import SwiftData

@Model
final class Entry {
    var date: Date = Date.now
    var weight: Double?
    var bodyFat: Double?
    var neck: Double?
    var shoulders: Double?
    var chest: Double?
    var biceps: Double?
    var forearm: Double?
    var waist: Double?
    var hips: Double?
    var thigh: Double?
    var calf: Double?
    var note: String = ""
    @Relationship(deleteRule: .cascade, inverse: \EntryPhoto.entry)
    var photos: [EntryPhoto] = []

    init(date: Date = .now) {
        self.date = date
    }

    subscript(metric: Metric) -> Double? {
        get { self[keyPath: metric.keyPath] }
        set { self[keyPath: metric.keyPath] = newValue }
    }

    var sortedPhotos: [EntryPhoto] {
        photos.sorted { $0.createdAt < $1.createdAt }
    }
}

@Model
final class EntryPhoto {
    @Attribute(.externalStorage) var data: Data
    @Attribute(.externalStorage) var thumbnail: Data?
    var createdAt: Date = Date.now
    var entry: Entry?

    init(data: Data, thumbnail: Data?) {
        self.data = data
        self.thumbnail = thumbnail
    }
}

enum Metric: String, CaseIterable, Identifiable, Hashable {
    case weight, bodyFat, neck, shoulders, chest, biceps, forearm, waist, hips, thigh, calf

    var id: String { rawValue }

    var title: String {
        switch self {
        case .weight: "Вес"
        case .bodyFat: "Жир"
        case .neck: "Шея"
        case .shoulders: "Плечи"
        case .chest: "Грудь"
        case .biceps: "Бицепс"
        case .forearm: "Предплечье"
        case .waist: "Талия"
        case .hips: "Ягодицы"
        case .thigh: "Бедро"
        case .calf: "Икра"
        }
    }

    var unit: String {
        switch self {
        case .weight: "кг"
        case .bodyFat: "%"
        default: "см"
        }
    }

    var keyPath: ReferenceWritableKeyPath<Entry, Double?> {
        switch self {
        case .weight: \.weight
        case .bodyFat: \.bodyFat
        case .neck: \.neck
        case .shoulders: \.shoulders
        case .chest: \.chest
        case .biceps: \.biceps
        case .forearm: \.forearm
        case .waist: \.waist
        case .hips: \.hips
        case .thigh: \.thigh
        case .calf: \.calf
        }
    }
}

struct MetricPoint: Identifiable {
    let date: Date
    let value: Double
    let entry: Entry
    var id: PersistentIdentifier { entry.persistentModelID }
}

extension Array where Element == Entry {
    /// Expects entries sorted by date ascending.
    func points(for metric: Metric) -> [MetricPoint] {
        compactMap { entry in
            entry[metric].map { MetricPoint(date: entry.date, value: $0, entry: entry) }
        }
    }
}

extension Double {
    var short: String {
        formatted(.number.precision(.fractionLength(0...1)))
    }

    var signed: String {
        formatted(.number.precision(.fractionLength(0...1)).sign(strategy: .always()))
    }

    var editable: String {
        formatted(.number.precision(.fractionLength(0...2)).grouping(.never))
    }
}

func parseNumber(_ text: String?) -> Double? {
    guard let text else { return nil }
    let cleaned = text.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ",", with: ".")
    return Double(cleaned)
}

func paddedDomain(_ values: [Double]) -> ClosedRange<Double> {
    guard let lo = values.min(), let hi = values.max() else { return 0...1 }
    let pad = Swift.max((hi - lo) * 0.15, Swift.max(abs(hi) * 0.01, 0.5))
    return (lo - pad)...(hi + pad)
}
