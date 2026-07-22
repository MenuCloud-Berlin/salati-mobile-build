package de.salatibox.de.wear

import android.content.Context
import org.json.JSONObject
import java.util.Calendar

// Spiegelt WearSyncPayload aus src/features/prayer-times/wear-sync.ts (JS-
// Seite) und Timings aus src/features/prayer-times/api.ts - bei Aenderungen
// dort (neues Feld, umbenannt) MUSS dieser Parser synchron gehalten werden.
// Analoges Vorgehen wie targets/salati-widget/SalatiPrayerWidget.swift
// (dortiger Kommentar): die Tile laeuft als eigener Prozess auf der Uhr und
// berechnet "naechstes Gebet" bei jedem Tile-Request selbst aus den zuletzt
// per Data Layer empfangenen Roh-Zeiten - nicht aus einem vorberechneten
// Einzelwert, damit die Tile auch dann noch stimmt, wenn das Telefon laenger
// nicht synchronisiert hat.

private val PRAYER_ORDER = listOf("Fajr", "Dhuhr", "Asr", "Maghrib", "Isha")
private const val PREFS_NAME = "salati_wear_prefs"
private const val KEY_PAYLOAD = "payload_json"

/**
 * Data-Layer-Pfad/Keys - MUSS wortgleich mit den Konstanten in
 * android/app/src/main/java/de/salatibox/de/wear/WearSyncModule.kt
 * (Telefonseite) bleiben. Kann NICHT als gemeinsame Kotlin-Datei geteilt
 * werden, da android/app (Telefon-APK) und android/wear (Uhr-APK) zwei
 * unabhaengige Gradle-Module ohne gegenseitige Dependency sind - ein
 * drittes :shared-Modul waere die saubere Loesung, wurde in diesem Scaffold
 * aber bewusst nicht angelegt (Scope, siehe USER-TODO.md).
 */
object WearDataLayer {
  const val DATA_PATH = "/salati/prayer-times"
  const val KEY_PAYLOAD = "payload"
  const val KEY_UPDATED_AT = "updatedAt"
}

data class Timings(
  val fajr: String,
  val dhuhr: String,
  val asr: String,
  val maghrib: String,
  val isha: String,
) {
  fun time(name: String): String? = when (name) {
    "Fajr" -> fajr
    "Dhuhr" -> dhuhr
    "Asr" -> asr
    "Maghrib" -> maghrib
    "Isha" -> isha
    else -> null
  }

  companion object {
    fun fromJson(o: JSONObject) = Timings(
      fajr = o.getString("Fajr"),
      dhuhr = o.getString("Dhuhr"),
      asr = o.getString("Asr"),
      maghrib = o.getString("Maghrib"),
      isha = o.getString("Isha"),
    )
  }
}

data class WearPayload(
  val locationLabel: String,
  val today: Timings,
  val tomorrow: Timings,
  val timeFormat: String,
) {
  companion object {
    fun fromJson(json: String): WearPayload? = try {
      val o = JSONObject(json)
      WearPayload(
        locationLabel = o.optString("locationLabel", "Salati"),
        today = Timings.fromJson(o.getJSONObject("today")),
        tomorrow = Timings.fromJson(o.getJSONObject("tomorrow")),
        timeFormat = o.optString("timeFormat", "24h"),
      )
    } catch (e: Exception) {
      null
    }
  }
}

data class NextPrayer(val name: String, val timestampMillis: Long)

/** Parst "HH:MM" auf den Kalendertag von `reference` - Portierung von parseTimeOn() aus next-prayer.ts. */
private fun parseTimeOn(hhmm: String, reference: Calendar): Calendar? {
  val parts = hhmm.split(":")
  if (parts.size < 2) return null
  val h = parts[0].toIntOrNull() ?: return null
  val m = parts[1].toIntOrNull() ?: return null
  val cal = reference.clone() as Calendar
  cal.set(Calendar.HOUR_OF_DAY, h)
  cal.set(Calendar.MINUTE, m)
  cal.set(Calendar.SECOND, 0)
  cal.set(Calendar.MILLISECOND, 0)
  return cal
}

/** Portierung von nextPrayer() aus next-prayer.ts: erstes noch nicht vergangenes
 * Gebet von heute, sonst Fajr von morgen. */
fun computeNextPrayer(payload: WearPayload, now: Calendar = Calendar.getInstance()): NextPrayer? {
  for (name in PRAYER_ORDER) {
    val hhmm = payload.today.time(name) ?: continue
    val ts = parseTimeOn(hhmm, now) ?: continue
    if (ts.timeInMillis > now.timeInMillis) {
      return NextPrayer(name, ts.timeInMillis)
    }
  }
  val tomorrow = now.clone() as Calendar
  tomorrow.add(Calendar.DAY_OF_YEAR, 1)
  val fajrTomorrow = parseTimeOn(payload.tomorrow.fajr, tomorrow) ?: return null
  return NextPrayer("Fajr", fajrTomorrow.timeInMillis)
}

/** Zwischenspeicher zwischen PrayerDataListenerService (Schreiber, empfaengt
 * vom Telefon) und PrayerTileService (Leser, rendert bei jedem Tile-Request) -
 * ein WearableListenerService haelt keinen Prozess dauerhaft am Leben, daher
 * kein In-Memory-Cache moeglich. */
object PrayerDataStore {
  fun save(context: Context, payloadJson: String) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_PAYLOAD, payloadJson)
      .apply()
  }

  fun load(context: Context): WearPayload? {
    val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(KEY_PAYLOAD, null) ?: return null
    return WearPayload.fromJson(raw)
  }
}
