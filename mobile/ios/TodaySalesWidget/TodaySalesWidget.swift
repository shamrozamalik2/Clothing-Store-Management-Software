import WidgetKit
import SwiftUI

// Mirrors android/.../TodaySalesWidgetProvider.kt — same keys, same shared
// storage contract (an App Group on this side instead of SharedPreferences),
// written by lib/core/widget/home_widget_service.dart. This file only ever
// renders the numbers it finds there; it never fetches anything itself.
private let appGroupId = "group.com.probusinesscloud.app"

struct TodaySalesEntry: TimelineEntry {
    let date: Date
    let signedIn: Bool
    let companyName: String
    let updatedAt: String
    let todaySales: Double
    let todayOrders: Int
    let todayProfit: Double

    static let placeholder = TodaySalesEntry(
        date: Date(),
        signedIn: true,
        companyName: "My Store",
        updatedAt: "",
        todaySales: 45600,
        todayOrders: 18,
        todayProfit: 12300
    )
}

struct TodaySalesProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodaySalesEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (TodaySalesEntry) -> Void) {
        completion(context.isPreview ? .placeholder : readEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodaySalesEntry>) -> Void) {
        let entry = readEntry()
        // iOS has no equivalent of the Android periodic refresh job — this
        // reload request is WidgetKit's own mechanism for keeping the widget
        // current, and the system budgets/paces it against battery and usage,
        // so this is a request, not a guarantee of exactly every 30 minutes.
        let nextReload = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextReload)))
    }

    private func readEntry() -> TodaySalesEntry {
        let defaults = UserDefaults(suiteName: appGroupId)
        return TodaySalesEntry(
            date: Date(),
            signedIn: defaults?.bool(forKey: "signed_in") ?? false,
            companyName: defaults?.string(forKey: "company_name") ?? "My Store",
            updatedAt: defaults?.string(forKey: "updated_at") ?? "",
            todaySales: defaults?.double(forKey: "today_sales") ?? 0,
            todayOrders: defaults?.integer(forKey: "today_orders") ?? 0,
            todayProfit: defaults?.double(forKey: "today_profit") ?? 0
        )
    }
}

private func money(_ amount: Double) -> String {
    let formatter = NumberFormat()
    return "Rs \(formatter.string(from: amount))"
}

/// Thin wrapper so the view code below reads the same whether or not
/// NumberFormatter's grouping separator is available.
private struct NumberFormat {
    private let formatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = 0
        f.groupingSeparator = ","
        return f
    }()
    func string(from value: Double) -> String {
        formatter.string(from: NSNumber(value: value)) ?? "\(Int(value))"
    }
}

struct TodaySalesWidgetView: View {
    let entry: TodaySalesEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(entry.companyName)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white.opacity(0.8))
                    .lineLimit(1)
                Spacer()
                if entry.signedIn {
                    Text(entry.updatedAt)
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.65))
                }
            }

            Spacer(minLength: 10)

            if entry.signedIn {
                Text(money(entry.todaySales))
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text("Today's Sales")
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.8))

                Spacer(minLength: 10)

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(entry.todayOrders)")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                        Text("Orders")
                            .font(.system(size: 10))
                            .foregroundColor(.white.opacity(0.65))
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(money(entry.todayProfit))
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                        Text("Profit")
                            .font(.system(size: 10))
                            .foregroundColor(.white.opacity(0.65))
                    }
                }
            } else {
                Text("—")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white)
                Text("Open the app to sign in")
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.8))
                Spacer(minLength: 10)
            }
        }
        .padding(16)
        .widgetBackground()
    }
}

/// `.containerBackground(for: .widget)` is required on iOS 17+ (a widget
/// with no container background is flagged and eventually rejected) and
/// unavailable before it — this picks the right one for the OS actually
/// running the widget. The app's own deployment target is iOS 16.
private extension View {
    @ViewBuilder
    func widgetBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(for: .widget) {
                LinearGradient(
                    colors: [Color(red: 0.173, green: 0.420, blue: 0.961), Color(red: 0.102, green: 0.325, blue: 0.816)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
        } else {
            background(
                LinearGradient(
                    colors: [Color(red: 0.173, green: 0.420, blue: 0.961), Color(red: 0.102, green: 0.325, blue: 0.816)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
        }
    }
}

struct TodaySalesWidget: Widget {
    // Must match HomeWidgetService.iosWidgetName on the Dart side.
    let kind: String = "TodaySalesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodaySalesProvider()) { entry in
            TodaySalesWidgetView(entry: entry)
        }
        .configurationDisplayName("Today's Sales")
        .description("Today's sales, orders and profit at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct TodaySalesWidgetBundle: WidgetBundle {
    var body: some Widget {
        TodaySalesWidget()
    }
}
