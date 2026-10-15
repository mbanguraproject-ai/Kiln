package game.devbangs.pipistrelle;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.ads.mediation.admob.AdMobAdapter;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.VersionInfo;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Ads for Pipistrelle through Google AdMob (Google Mobile Ads SDK 24, owner decision D17): a rewarded ad the player
 * chooses at the Last Echo, and an interstitial at a break between runs (every third run, decided by the game).
 *
 * Consent first: Google's User Messaging Platform asks for consent where the law requires it (the EEA, the UK,
 * Switzerland) before any ad is requested, and offers privacy options the player can reopen from Settings.
 * Ads are non-personalised unless the player allows personalised ads in Settings (the "npa" extra).
 *
 * Every call runs on the main thread; every failure comes back to the game with Google's error code and message
 * (shown in Settings), and everything is logged under "PipAds" (adb logcat -s PipAds). Test ads: debuggable builds
 * use Google's demo ad units (chosen by the game), so our own installs never count as real traffic.
 */
@CapacitorPlugin(name = "PipAds")
public class PipAdsPlugin extends Plugin {

    private static final String TAG = "PipAds";
    private final AtomicBoolean started = new AtomicBoolean(false);
    private boolean ready;
    private boolean personalised;
    private String lastError = "";

    private RewardedAd rewarded;
    private InterstitialAd interstitial;
    private boolean loadingRewarded;
    private boolean loadingInterstitial;
    // init calls that arrived while the SDK was still starting: answered together once it has
    private final List<PluginCall> waiting = new ArrayList<>();

    private boolean debuggable() {
        return (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private void fail(PluginCall call, String stage, String code, String message) {
        lastError = stage + ": " + code + (message == null || message.isEmpty() ? "" : " (" + message + ")");
        Log.w(TAG, lastError);
        call.reject(message == null || message.isEmpty() ? code : message, code);
    }

    private static String loadCode(LoadAdError e) {
        if (e == null) return "UNKNOWN";
        switch (e.getCode()) {
            case AdRequest.ERROR_CODE_INTERNAL_ERROR: return "INTERNAL_ERROR";
            case AdRequest.ERROR_CODE_INVALID_REQUEST: return "INVALID_REQUEST";
            case AdRequest.ERROR_CODE_NETWORK_ERROR: return "NETWORK_ERROR";
            case AdRequest.ERROR_CODE_NO_FILL: return "NO_FILL";
            case AdRequest.ERROR_CODE_APP_ID_MISSING: return "APP_ID_MISSING";
            case AdRequest.ERROR_CODE_REQUEST_ID_MISMATCH: return "REQUEST_ID_MISMATCH";
            case AdRequest.ERROR_CODE_INVALID_AD_STRING: return "INVALID_AD_STRING";
            case AdRequest.ERROR_CODE_MEDIATION_NO_FILL: return "MEDIATION_NO_FILL";
            default: return "ERROR_" + e.getCode();
        }
    }

    private static String sdkVersion() {
        VersionInfo v = MobileAds.getVersion();
        return v.getMajorVersion() + "." + v.getMinorVersion() + "." + v.getMicroVersion();
    }

    private AdRequest request() {
        AdRequest.Builder b = new AdRequest.Builder();
        if (!personalised) {
            Bundle extras = new Bundle();
            extras.putString("npa", "1");
            b.addNetworkExtrasBundle(AdMobAdapter.class, extras);
        }
        return b.build();
    }

    private JSObject info() {
        JSObject r = new JSObject();
        ConsentInformation ci = UserMessagingPlatform.getConsentInformation(getContext());
        r.put("ready", ready);
        r.put("testMode", debuggable());
        r.put("version", sdkVersion());
        r.put("canRequestAds", ci.canRequestAds());
        r.put("privacyRequired", ci.getPrivacyOptionsRequirementStatus() == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED);
        r.put("rewarded", rewarded != null);
        r.put("interstitial", interstitial != null);
        r.put("lastError", lastError);
        return r;
    }

    // consent (where the law requires it), then the SDK; resolves once ads may be requested
    @PluginMethod
    public void init(PluginCall call) {
        personalised = Boolean.TRUE.equals(call.getBoolean("personalised", false));
        final Activity activity = getActivity();
        if (activity == null) {
            fail(call, "init", "NO_ACTIVITY", "the app is not in the foreground");
            return;
        }
        getBridge().executeOnMainThread(() -> {
            if (ready) {
                call.resolve(info());
                return;
            }
            final ConsentInformation ci = UserMessagingPlatform.getConsentInformation(activity);
            final AtomicBoolean answered = new AtomicBoolean(false);
            final Runnable startSdk = () -> {
                if (!ci.canRequestAds()) {
                    if (answered.compareAndSet(false, true)) fail(call, "consent", "NO_CONSENT", "ads may not be requested yet");
                    return;
                }
                if (!started.compareAndSet(false, true)) {
                    if (answered.compareAndSet(false, true)) {
                        if (ready) call.resolve(info());
                        else waiting.add(call);
                    }
                    return;
                }
                Log.i(TAG, "starting Google Mobile Ads " + sdkVersion() + (debuggable() ? " (test ads)" : ""));
                // the SDK starts on a background thread, as Google recommends
                new Thread(() -> MobileAds.initialize(activity.getApplicationContext(), status -> getBridge().executeOnMainThread(() -> {
                    ready = true;
                    lastError = "";
                    Log.i(TAG, "started");
                    if (answered.compareAndSet(false, true)) call.resolve(info());
                    for (PluginCall w : waiting) w.resolve(info());
                    waiting.clear();
                }))).start();
            };
            ConsentRequestParameters params = new ConsentRequestParameters.Builder().build();
            ci.requestConsentInfoUpdate(activity, params,
                () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, formError -> {
                    if (formError != null) Log.w(TAG, "consent form: " + formError.getErrorCode() + " " + formError.getMessage());
                    startSdk.run();
                }),
                requestError -> {
                    // no consent message configured, or offline: ads can still be requested where consent is not needed
                    Log.w(TAG, "consent info: " + requestError.getErrorCode() + " " + requestError.getMessage());
                    startSdk.run();
                });
            // consent from an earlier session: start at once, without waiting for the update
            if (ci.canRequestAds()) startSdk.run();
        });
    }

    @PluginMethod
    public void setPrivacy(PluginCall call) {
        personalised = Boolean.TRUE.equals(call.getBoolean("personalised", false));
        // ads already loaded were requested with the old choice: drop them, the game loads fresh ones
        getBridge().executeOnMainThread(() -> {
            rewarded = null;
            interstitial = null;
            call.resolve(info());
        });
    }

    // the consent form again (Settings, "Privacy options"), where the law requires it
    @PluginMethod
    public void privacyOptions(PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null) {
            fail(call, "privacy", "NO_ACTIVITY", "the app is not in the foreground");
            return;
        }
        getBridge().executeOnMainThread(() -> UserMessagingPlatform.showPrivacyOptionsForm(activity, formError -> {
            if (formError != null) fail(call, "privacy", "FORM_" + formError.getErrorCode(), formError.getMessage());
            else call.resolve(info());
        }));
    }

    // load one ad: kind "rewarded" or "interstitial", unitId the ad unit; replace drops one already loaded (too old)
    @PluginMethod
    public void load(PluginCall call) {
        final String kind = call.getString("kind", "rewarded");
        final String unit = call.getString("unitId");
        if (unit == null || unit.isEmpty()) {
            fail(call, "load", "INVALID_ARGUMENT", "no ad unit ID");
            return;
        }
        final boolean isRewarded = !"interstitial".equals(kind);
        final boolean replace = Boolean.TRUE.equals(call.getBoolean("replace", false));
        getBridge().executeOnMainThread(() -> {
            if (replace) {
                if (isRewarded) rewarded = null;
                else interstitial = null;
            }
            if (!ready) {
                fail(call, "load", "NOT_STARTED", "Google Mobile Ads has not started");
                return;
            }
            if (isRewarded ? rewarded != null : interstitial != null) {
                call.resolve(info());
                return;
            }
            if (isRewarded ? loadingRewarded : loadingInterstitial) {
                fail(call, "load", "BUSY", "already loading");
                return;
            }
            Log.i(TAG, "loading " + kind + " " + unit);
            try {
                if (isRewarded) {
                    loadingRewarded = true;
                    RewardedAd.load(getContext(), unit, request(), new RewardedAdLoadCallback() {
                        @Override
                        public void onAdLoaded(@NonNull RewardedAd ad) {
                            loadingRewarded = false;
                            rewarded = ad;
                            lastError = "";
                            Log.i(TAG, "rewarded loaded");
                            call.resolve(info());
                        }

                        @Override
                        public void onAdFailedToLoad(@NonNull LoadAdError error) {
                            loadingRewarded = false;
                            rewarded = null;
                            fail(call, "load", loadCode(error), error.getMessage());
                        }
                    });
                } else {
                    loadingInterstitial = true;
                    InterstitialAd.load(getContext(), unit, request(), new InterstitialAdLoadCallback() {
                        @Override
                        public void onAdLoaded(@NonNull InterstitialAd ad) {
                            loadingInterstitial = false;
                            interstitial = ad;
                            lastError = "";
                            Log.i(TAG, "interstitial loaded");
                            call.resolve(info());
                        }

                        @Override
                        public void onAdFailedToLoad(@NonNull LoadAdError error) {
                            loadingInterstitial = false;
                            interstitial = null;
                            fail(call, "load", loadCode(error), error.getMessage());
                        }
                    });
                }
            } catch (Throwable t) {
                if (isRewarded) loadingRewarded = false; else loadingInterstitial = false;
                fail(call, "load", "EXCEPTION", String.valueOf(t.getMessage()));
            }
        });
    }

    // show the loaded ad of a kind; resolves { shown, rewarded } when it is closed
    @PluginMethod
    public void show(PluginCall call) {
        final String kind = call.getString("kind", "rewarded");
        final boolean isRewarded = !"interstitial".equals(kind);
        final Activity activity = getActivity();
        getBridge().executeOnMainThread(() -> {
            if (activity == null || (isRewarded ? rewarded == null : interstitial == null)) {
                fail(call, "show", "NOT_READY", "no ad is loaded");
                return;
            }
            final AtomicBoolean earned = new AtomicBoolean(false), done = new AtomicBoolean(false);
            final FullScreenContentCallback cb = new FullScreenContentCallback() {
                @Override
                public void onAdShowedFullScreenContent() {
                    Log.i(TAG, kind + " showing");
                    notifyListeners("started", new JSObject());
                }

                @Override
                public void onAdFailedToShowFullScreenContent(@NonNull AdError error) {
                    if (!done.compareAndSet(false, true)) return;
                    fail(call, "show", "SHOW_" + error.getCode(), error.getMessage());
                }

                @Override
                public void onAdDismissedFullScreenContent() {
                    if (!done.compareAndSet(false, true)) return;
                    Log.i(TAG, kind + " closed" + (isRewarded ? (earned.get() ? ", reward earned" : ", no reward") : ""));
                    JSObject r = new JSObject();
                    r.put("shown", true);
                    r.put("rewarded", earned.get());
                    call.resolve(r);
                }
            };
            try {
                if (isRewarded) {
                    RewardedAd ad = rewarded;
                    rewarded = null; // an ad is shown once
                    ad.setFullScreenContentCallback(cb);
                    ad.show(activity, item -> earned.set(true));
                } else {
                    InterstitialAd ad = interstitial;
                    interstitial = null;
                    ad.setFullScreenContentCallback(cb);
                    ad.show(activity);
                }
            } catch (Throwable t) {
                if (done.compareAndSet(false, true)) fail(call, "show", "EXCEPTION", String.valueOf(t.getMessage()));
            }
        });
    }

    @PluginMethod
    public void status(PluginCall call) {
        getBridge().executeOnMainThread(() -> call.resolve(info()));
    }
}
