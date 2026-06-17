package com.example.nara_mobile_app

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import android.util.Base64

class MainActivity : FlutterActivity() {
    private val channelName = "nara/secure_store"
    private val keyAlias = "nara_secure_token_key"
    private val prefsName = "nara_secure_store"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                val key = call.argument<String>("key")
                if (key.isNullOrBlank()) {
                    result.error("invalid_key", "Secure store key is required.", null)
                    return@setMethodCallHandler
                }

                try {
                    when (call.method) {
                        "read" -> result.success(readSecureValue(key))
                        "write" -> {
                            val value = call.argument<String>("value") ?: ""
                            writeSecureValue(key, value)
                            result.success(null)
                        }
                        "delete" -> {
                            deleteSecureValue(key)
                            result.success(null)
                        }
                        else -> result.notImplemented()
                    }
                } catch (error: Exception) {
                    result.error("secure_store_failed", error.message, null)
                }
            }
    }

    private fun readSecureValue(key: String): String? {
        val prefs = getSharedPreferences(prefsName, Context.MODE_PRIVATE)
        val encrypted = prefs.getString("$key.ciphertext", null) ?: return null
        val iv = prefs.getString("$key.iv", null) ?: return null
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(
            Cipher.DECRYPT_MODE,
            getOrCreateSecretKey(),
            GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP))
        )
        val plain = cipher.doFinal(Base64.decode(encrypted, Base64.NO_WRAP))
        return plain.toString(Charsets.UTF_8)
    }

    private fun writeSecureValue(key: String, value: String) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateSecretKey())
        val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
        getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            .edit()
            .putString("$key.ciphertext", Base64.encodeToString(encrypted, Base64.NO_WRAP))
            .putString("$key.iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .apply()
    }

    private fun deleteSecureValue(key: String) {
        getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            .edit()
            .remove("$key.ciphertext")
            .remove("$key.iv")
            .apply()
    }

    private fun getOrCreateSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getEntry(keyAlias, null) as? KeyStore.SecretKeyEntry)?.let {
            return it.secretKey
        }

        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            "AndroidKeyStore"
        )
        val spec = KeyGenParameterSpec.Builder(
            keyAlias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build()

        keyGenerator.init(spec)
        return keyGenerator.generateKey()
    }
}
