import SwiftUI
import UIKit

struct ProcessedImage: Sendable {
    let full: Data
    let thumb: Data
}

enum ImageProcessing {
    static func prepare(_ data: Data) -> ProcessedImage? {
        guard let image = UIImage(data: data) else { return nil }
        return prepare(image)
    }

    /// Downscales so photos don't bloat storage; also bakes in EXIF orientation.
    static func prepare(_ image: UIImage) -> ProcessedImage? {
        guard
            let full = image.resized(maxSide: 2000).jpegData(compressionQuality: 0.85),
            let thumb = image.resized(maxSide: 400).jpegData(compressionQuality: 0.8)
        else { return nil }
        return ProcessedImage(full: full, thumb: thumb)
    }
}

extension UIImage {
    func resized(maxSide: CGFloat) -> UIImage {
        let scale = min(1, maxSide / max(size.width, size.height))
        let newSize = CGSize(width: (size.width * scale).rounded(), height: (size.height * scale).rounded())
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        return UIGraphicsImageRenderer(size: newSize, format: format).image { _ in
            draw(in: CGRect(origin: .zero, size: newSize))
        }
    }
}

struct CameraPicker: UIViewControllerRepresentable {
    var onImage: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker

        init(_ parent: CameraPicker) {
            self.parent = parent
        }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            if let image = info[.originalImage] as? UIImage {
                parent.onImage(image)
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}
