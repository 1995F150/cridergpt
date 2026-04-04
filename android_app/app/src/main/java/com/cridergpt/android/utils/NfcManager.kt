package com.cridergpt.android.utils

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.nfc.tech.NdefFormatable
import android.os.Build
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class NfcManager(private val context: Context) {

    private val nfcAdapter: NfcAdapter? = NfcAdapter.getDefaultAdapter(context)
    private val _nfcState = MutableStateFlow<NfcState>(NfcState.Idle)
    val nfcState: StateFlow<NfcState> = _nfcState

    sealed class NfcState {
        object Idle : NfcState()
        object Scanning : NfcState()
        data class TagDetected(val tagId: String, val tagData: String?) : NfcState()
        data class Error(val message: String) : NfcState()
    }

    fun isNfcAvailable(): Boolean {
        return nfcAdapter != null
    }

    fun isNfcEnabled(): Boolean {
        return nfcAdapter?.isEnabled == true
    }

    fun startScanning(activity: androidx.activity.ComponentActivity) {
        if (!isNfcAvailable()) {
            _nfcState.value = NfcState.Error("NFC is not available on this device")
            return
        }

        if (!isNfcEnabled()) {
            _nfcState.value = NfcState.Error("NFC is disabled. Please enable it in settings")
            return
        }

        _nfcState.value = NfcState.Scanning

        val intent = Intent(context, activity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }

        val pendingIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_MUTABLE)
        } else {
            PendingIntent.getActivity(context, 0, intent, 0)
        }

        val intentFilters = arrayOf(
            IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED).apply {
                addDataType("*/*")
            },
            IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED)
        )

        val techLists = arrayOf(
            arrayOf(Ndef::class.java.name),
            arrayOf(NdefFormatable::class.java.name)
        )

        nfcAdapter?.enableForegroundDispatch(activity, pendingIntent, intentFilters, techLists)
    }

    fun stopScanning(activity: androidx.activity.ComponentActivity) {
        nfcAdapter?.disableForegroundDispatch(activity)
        _nfcState.value = NfcState.Idle
    }

    fun handleNfcIntent(intent: Intent) {
        val action = intent.action
        if (action == NfcAdapter.ACTION_NDEF_DISCOVERED ||
            action == NfcAdapter.ACTION_TECH_DISCOVERED) {

            val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG)
            tag?.let { processTag(it) }
        }
    }

    private fun processTag(tag: Tag) {
        try {
            val tagId = tag.id.joinToString("") { String.format("%02X", it) }
            var tagData: String? = null

            // Try to read NDEF data
            val ndef = Ndef.get(tag)
            ndef?.connect()
            ndef?.ndefMessage?.records?.firstOrNull()?.let { record ->
                tagData = String(record.payload)
            }
            ndef?.close()

            _nfcState.value = NfcState.TagDetected(tagId, tagData)
        } catch (e: Exception) {
            _nfcState.value = NfcState.Error("Failed to read NFC tag: ${e.message}")
        }
    }

    fun writeTag(tag: Tag, data: String): Boolean {
        return try {
            val ndef = Ndef.get(tag)
            ndef?.connect()

            if (ndef?.isWritable == true) {
                val message = NdefMessage(
                    arrayOf(
                        NdefRecord.createTextRecord("en", data)
                    )
                )
                ndef.writeNdefMessage(message)
                ndef.close()
                true
            } else {
                // Try to format and write
                val ndefFormatable = NdefFormatable.get(tag)
                ndefFormatable?.connect()
                ndefFormatable?.format(
                    NdefMessage(
                        arrayOf(
                            NdefRecord.createTextRecord("en", data)
                        )
                    )
                )
                ndefFormatable?.close()
                true
            }
        } catch (e: Exception) {
            _nfcState.value = NfcState.Error("Failed to write NFC tag: ${e.message}")
            false
        }
    }
}