package com.sasgarments.sas_garments_mobile

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.SharedPreferences
import android.widget.RemoteViews
import es.antonborri.home_widget.HomeWidgetLaunchIntent
import es.antonborri.home_widget.HomeWidgetProvider
import java.text.NumberFormat
import java.util.Locale

/**
 * Home screen widget: today's sales, orders and profit for the signed-in
 * company. Reads whatever [HomeWidgetService] (Dart side) last pushed into
 * shared storage — this class only ever renders, it never fetches.
 *
 * Values written from Dart as a `double` (today_sales, today_profit) are
 * stored by the home_widget plugin as the raw bits of a Long, flagged by a
 * companion "home_widget.double.<key>" boolean — see HomeWidgetPlugin.kt.
 * An Int (today_orders) and Strings/Booleans are stored directly.
 */
class TodaySalesWidgetProvider : HomeWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
        widgetData: SharedPreferences,
    ) {
        val signedIn = widgetData.getBoolean("signed_in", false)
        val companyName = widgetData.getString("company_name", null) ?: "My Store"
        val updatedAt = widgetData.getString("updated_at", null)
        val sales = readDouble(widgetData, "today_sales")
        val profit = readDouble(widgetData, "today_profit")
        val orders = widgetData.getInt("today_orders", 0)

        appWidgetIds.forEach { widgetId ->
            val views = RemoteViews(context.packageName, R.layout.today_sales_widget).apply {
                setOnClickPendingIntent(
                    R.id.widget_root,
                    HomeWidgetLaunchIntent.getActivity(context, MainActivity::class.java),
                )
                setTextViewText(R.id.widget_company_name, companyName)

                if (signedIn) {
                    setTextViewText(R.id.widget_updated_at, updatedAt ?: "")
                    setTextViewText(R.id.widget_sales_amount, formatMoney(sales))
                    setTextViewText(R.id.widget_sales_label, "Today's Sales")
                    setTextViewText(R.id.widget_orders_value, orders.toString())
                    setTextViewText(R.id.widget_profit_value, formatMoney(profit))
                    setViewVisibility(R.id.widget_divider, android.view.View.VISIBLE)
                    setViewVisibility(R.id.widget_secondary_row, android.view.View.VISIBLE)
                } else {
                    setTextViewText(R.id.widget_updated_at, "")
                    setTextViewText(R.id.widget_sales_amount, "—")
                    setTextViewText(R.id.widget_sales_label, "Open the app to sign in")
                    setViewVisibility(R.id.widget_divider, android.view.View.GONE)
                    setViewVisibility(R.id.widget_secondary_row, android.view.View.GONE)
                }
            }
            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }

    private fun readDouble(prefs: SharedPreferences, key: String): Double {
        val isDouble = prefs.getBoolean("home_widget.double.$key", false)
        return if (isDouble) {
            java.lang.Double.longBitsToDouble(prefs.getLong(key, 0L))
        } else {
            0.0
        }
    }

    private fun formatMoney(amount: Double): String {
        val formatter = NumberFormat.getNumberInstance(Locale.US)
        formatter.maximumFractionDigits = 0
        return "Rs ${formatter.format(amount)}"
    }
}
