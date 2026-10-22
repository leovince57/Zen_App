import Foundation
import Vision
import AppKit
for path in CommandLine.arguments.dropFirst() {
    print("IMAGE \(path)")
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.recognitionLanguages = ["zh-Hans", "en-US"]
    req.usesLanguageCorrection = true
    do {
        try VNImageRequestHandler(url: URL(fileURLWithPath:path)).perform([req])
        for row in (req.results ?? []).sorted(by: { $0.boundingBox.midY > $1.boundingBox.midY }) {
            if let s = row.topCandidates(1).first { print(s.string) }
        }
    } catch { print(error) }
}
