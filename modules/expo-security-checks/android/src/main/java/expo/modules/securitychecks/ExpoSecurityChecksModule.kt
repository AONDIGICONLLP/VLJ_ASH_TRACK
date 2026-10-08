package expo.modules.securitychecks

import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoSecurityChecksModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ExpoSecurityChecks")

    Function("isDeveloperOptionsEnabled") {
      Settings.Global.getInt(
        context.contentResolver,
        Settings.Global.DEVELOPMENT_SETTINGS_ENABLED,
        0
      ) != 0
    }

    // Jumps straight to Android's Developer Options screen so the user can
    // flip the toggle off without hunting through Settings themselves.
    // Returns false (instead of throwing) if there's no foreground activity
    // to launch from, so the caller can degrade gracefully.
    Function("openDeveloperOptionsSettings") {
      try {
        val intent = Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        appContext.throwingActivity.startActivity(intent)
        true
      } catch (e: Throwable) {
        false
      }
    }
  }
}
