import SwiftUI
import WebKit
import Network

struct AIAdvokatRootView: View {
    @State private var selectedURL = URL(string: "https://ai-advokat.github.io/")!
    @State private var reloadToken = UUID()
    @State private var isOnline = true

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if !isOnline {
                    Text("Offline · правните извори и AI одговорите бараат интернет")
                        .font(.footnote)
                        .frame(maxWidth: .infinity)
                        .padding(8)
                        .background(.orange.opacity(0.18))
                }

                AIAdvokatWebView(url: selectedURL, reloadToken: reloadToken)
                    .ignoresSafeArea(edges: .bottom)
            }
            .navigationTitle("AI Advokat")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .bottomBar) {
                    Button("Почетна", systemImage: "house") {
                        selectedURL = URL(string: "https://ai-advokat.github.io/")!
                    }
                    Spacer()
                    Button("Закони", systemImage: "books.vertical") {
                        selectedURL = URL(string: "https://ai-advokat.github.io/#sources")!
                    }
                    Spacer()
                    Button("AI", systemImage: "sparkles") {
                        selectedURL = URL(string: "https://ai-advokat.github.io/#research")!
                    }
                    Spacer()
                    Button("Обнови", systemImage: "arrow.clockwise") {
                        reloadToken = UUID()
                    }
                    Spacer()
                    ShareLink(item: selectedURL)
                }
            }
            .task {
                let monitor = NWPathMonitor()
                let queue = DispatchQueue(label: "AIAdvokat.Network")
                monitor.pathUpdateHandler = { path in
                    Task { @MainActor in
                        isOnline = path.status == .satisfied
                    }
                }
                monitor.start(queue: queue)
            }
        }
    }
}

struct AIAdvokatWebView: UIViewRepresentable {
    let url: URL
    let reloadToken: UUID

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let target = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            if target.host == "ai-advokat.github.io" || target.host == nil {
                decisionHandler(.allow)
            } else {
                UIApplication.shared.open(target)
                decisionHandler(.cancel)
            }
        }
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.customUserAgent = "AIAdvokat-iOS/1.0"
        webView.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if webView.url?.absoluteString != url.absoluteString {
            webView.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData))
        } else {
            webView.reload()
        }
    }
}
