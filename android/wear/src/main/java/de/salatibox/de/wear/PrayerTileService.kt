package de.salatibox.de.wear

import android.text.format.DateFormat
import androidx.wear.tiles.ColorBuilders.argb
import androidx.wear.tiles.DimensionBuilders.dp
import androidx.wear.tiles.LayoutElementBuilders.Column
import androidx.wear.tiles.LayoutElementBuilders.Layout
import androidx.wear.tiles.RequestBuilders.ResourcesRequest
import androidx.wear.tiles.RequestBuilders.TileRequest
// androidx.wear.tiles:tiles:1.4.0 definiert TileService.onTileResourcesRequest()
// selbst schon gegen den neueren androidx.wear.protolayout.ResourceBuilders.Resources
// (per javap gegen die aufgeloeste 1.4.0-AAR verifiziert, 2026-07-20) - die
// tiles.ResourceBuilders.Resources-Variante passt hier NICHT als Override-
// Rueckgabetyp, obwohl der Kopfkommentar in wear/build.gradle bewusst gegen
// die protolayout-Artefakte entschieden hatte (tiles:1.4.0 zieht sie intern
// trotzdem als Abhaengigkeit).
import androidx.wear.protolayout.ResourceBuilders.Resources
import androidx.wear.tiles.TileBuilders.Tile
import androidx.wear.tiles.TileService
import androidx.wear.tiles.TimelineBuilders.Timeline
import androidx.wear.tiles.TimelineBuilders.TimelineEntry
import androidx.wear.tiles.material.Text
import androidx.wear.tiles.material.Typography
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// "Naechstes Gebet"-Tile - Uhr-Pendant zu targets/salati-widget/SalatiPrayerWidget.swift
// (iOS-Homescreen-Widget) und src/widgets/PrayerWidget.tsx (Android-Telefon-
// Homescreen-Widget). Liest NIE den JS-Prozess der Telefon-App direkt (auf
// der Uhr laeuft ohnehin kein React-Native-JS) - Datenquelle ist
// ausschliesslich PrayerDataStore (SharedPreferences), befuellt von
// PrayerDataListenerService.kt ueber die Wearable Data Layer API.
//
// UNGETESTET: konnte in dieser Session nicht kompiliert/auf einem Wear-OS-
// Geraet oder -Emulator ausgefuehrt werden (kein macOS/kein Android-Wear-
// Testgeraet verfuegbar, siehe USER-TODO.md). Die androidx.wear.tiles-API-
// Aufrufe hier folgen der oeffentlichen Dokumentation, wurden aber nicht
// gegen den tatsaechlichen Compiler/eine echte Tile-Renderfunktion
// verifiziert - vor dem ersten echten Einsatz in Android Studio oeffnen und
// am Wear-OS-Emulator pruefen.
class PrayerTileService : TileService() {

  override fun onTileRequest(requestParams: TileRequest): ListenableFuture<Tile> {
    val payload = PrayerDataStore.load(applicationContext)
    val next = payload?.let { computeNextPrayer(it) }

    val layout = buildLayout(payload, next)

    val tile = Tile.Builder()
      .setResourcesVersion(RESOURCES_VERSION)
      // Kurzes Freshness-Interval: die Tile zeigt eine Restzeit-Uhrzeit
      // (kein laufender Sekunden-Countdown, WidgetKit-Timeline-Verhalten wie
      // im iOS-Widget gibt es bei Tiles nicht) - ein periodisches Reload alle
      // Minute haelt "in Xh Ym" halbwegs aktuell, ohne den Akku zu belasten.
      .setFreshnessIntervalMillis(60_000L)
      .setTimeline(
        Timeline.Builder()
          .addTimelineEntry(
            TimelineEntry.Builder().setLayout(Layout.Builder().setRoot(layout).build()).build(),
          )
          .build(),
      )
      .build()

    return Futures.immediateFuture(tile)
  }

  override fun onTileResourcesRequest(requestParams: ResourcesRequest): ListenableFuture<Resources> =
    Futures.immediateFuture(Resources.Builder().setVersion(RESOURCES_VERSION).build())

  private fun buildLayout(payload: WearPayload?, next: NextPrayer?) =
    Column.Builder()
      .addContent(
        Text.Builder(this, payload?.locationLabel ?: "Salati")
          .setTypography(Typography.TYPOGRAPHY_CAPTION1)
          .setColor(argb(COLOR_MUTED))
          .build(),
      )
      .addContent(
        Text.Builder(this, next?.name?.let { translatePrayerName(it) } ?: "–")
          .setTypography(Typography.TYPOGRAPHY_TITLE2)
          .setColor(argb(COLOR_ACCENT))
          .build(),
      )
      .addContent(
        Text.Builder(this, next?.let { formatTime(it.timestampMillis) } ?: "App öffnen")
          .setTypography(Typography.TYPOGRAPHY_BODY1)
          .setColor(argb(COLOR_TEXT))
          .build(),
      )
      .setWidth(dp(200f))
      .build()

  private fun formatTime(timestampMillis: Long): String {
    val is24h = DateFormat.is24HourFormat(this)
    val pattern = if (is24h) "HH:mm" else "h:mm a"
    return SimpleDateFormat(pattern, Locale.getDefault()).format(Date(timestampMillis))
  }

  // Kurzform, spiegelt t('prayers.*') aus src/lib/i18n (dortige Uebersetzungen
  // sind JS-JSON, hier bewusst hart codiert statt dupliziert geladen - die
  // Uhr hat keinen Zugriff auf den i18n-Sprachstatus der Telefon-App ohne
  // eine weitere Data-Layer-Uebertragung, siehe USER-TODO.md).
  private fun translatePrayerName(name: String): String = when (name) {
    "Fajr" -> "Fajr"
    "Dhuhr" -> "Dhuhr"
    "Asr" -> "Asr"
    "Maghrib" -> "Maghrib"
    "Isha" -> "Isha"
    else -> name
  }

  companion object {
    private const val RESOURCES_VERSION = "1"
    private const val COLOR_ACCENT = 0xFFD4AF37.toInt() // Brand.gold
    private const val COLOR_TEXT = 0xFFF5F1E6.toInt()
    private const val COLOR_MUTED = 0xFFA8A29E.toInt()
  }
}
