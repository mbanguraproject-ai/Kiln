package com.mbanguraproject.pipistrelle;

import android.content.pm.ApplicationInfo;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.unity3d.ads.InitializationConfiguration;
import com.unity3d.ads.LoadConfiguration;
import com.unity3d.ads.RewardedAd;
import com.unity3d.ads.RewardedShowListener;
import com.unity3d.ads.ShowConfiguration;
import com.unity3d.ads.ShowFinishState;
import com.unity3d.ads.UnityAds;
import com.unity3d.ads.UnityAdsError;

/**
 * Rewarded ads for Pipistrelle through the Unity Ads SDK (4.21, the RewardedAd API). The game decides when an ad
 * may be offered (only at the Last Echo, only when the player taps "Fly on"); this plugin only initialises the SDK,
 * keeps one rewarded ad loaded, shows it on request and reports whether it was watched through.
 *
 * Privacy: ads are non-personalised unless the player allows personalised ads in Settings (setPrivacy).
 * Test mode: "auto" uses Unity's test ads in debuggable builds, so our own installs never count as real traffic.
 */
@CapacitorPlugin(name = "PipAds")
public class PipAdsPlugin extends Plugin {

    private RewardedAd rewarded;
    private boolean loading;

    private boolean debuggable() {
        return (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private void applyPrivacy(boolean personalised) {
        UnityAds.setNonBehavioral(!personalised);
        UnityAds.setUserConsent(personalised);
        UnityAds.setUserOptOut(!personalised);
    }

    @PluginMethod
    public void init(PluginCall call) {
        String gameId = call.getString("gameId");
        if (gameId == null || gameId.isEmpty()) {
            call.reject("gameId is required");
            return;
        }
        String mode = call.getString("testMode", "auto");
        boolean test = "auto".equals(mode) ? debuggable() : "true".equals(mode);
        applyPrivacy(Boolean.TRUE.equals(call.getBoolean("personalised", false)));
        if (UnityAds.isInitialized()) {
            JSObject r = new JSObject();
            r.put("ok", true);
            r.put("testMode", test);
            call.resolve(r);
            return;
        }
        InitializationConfiguration config = new InitializationConfiguration.Builder(gameId).withTestMode(test).build();
        UnityAds.initialize(config, error -> {
            if (error == null) {
                JSObject r = new JSObject();
                r.put("ok", true);
                r.put("testMode", test);
                call.resolve(r);
            } else {
                call.reject(error.getMessage(), String.valueOf(error.getCode()));
            }
        });
    }

    @PluginMethod
    public void setPrivacy(PluginCall call) {
        applyPrivacy(Boolean.TRUE.equals(call.getBoolean("personalised", false)));
        call.resolve();
    }

    @PluginMethod
    public void load(PluginCall call) {
        String placement = call.getString("placementId");
        if (placement == null || placement.isEmpty()) {
            call.reject("placementId is required");
            return;
        }
        if (rewarded != null) {
            call.resolve(ready(true));
            return;
        }
        if (loading) {
            call.reject("already loading");
            return;
        }
        loading = true;
        RewardedAd.load(new LoadConfiguration.Builder(placement).build(), (ad, error) -> {
            loading = false;
            if (ad != null && error == null) {
                rewarded = ad;
                ad.setOnAdExpired(expired -> {
                    if (rewarded == expired) rewarded = null;
                    notifyListeners("expired", new JSObject());
                });
                call.resolve(ready(true));
            } else {
                call.reject(error != null ? error.getMessage() : "no ad available", error != null ? String.valueOf(error.getCode()) : "0");
            }
        });
    }

    @PluginMethod
    public void isReady(PluginCall call) {
        call.resolve(ready(rewarded != null));
    }

    @PluginMethod
    public void show(PluginCall call) {
        final RewardedAd ad = rewarded;
        if (ad == null) {
            call.reject("no ad ready");
            return;
        }
        rewarded = null;
        getActivity().runOnUiThread(() -> ad.show(getActivity(), new ShowConfiguration.Builder().build(), new RewardedShowListener() {
            private boolean earned;
            private boolean done;

            @Override
            public void onRewarded(RewardedAd a) {
                earned = true;
            }

            @Override
            public void onStarted(RewardedAd a) {
                notifyListeners("started", new JSObject());
            }

            @Override
            public void onClicked(RewardedAd a) {
            }

            @Override
            public void onCompleted(RewardedAd a, ShowFinishState state) {
                if (done) return;
                done = true;
                JSObject r = new JSObject();
                r.put("rewarded", earned || state == ShowFinishState.COMPLETED);
                r.put("state", state.name());
                call.resolve(r);
            }

            @Override
            public void onFailed(RewardedAd a, UnityAdsError error) {
                if (done) return;
                done = true;
                call.reject(error.getMessage(), String.valueOf(error.getCode()));
            }
        }));
    }

    private static JSObject ready(boolean ready) {
        JSObject r = new JSObject();
        r.put("ready", ready);
        return r;
    }
}
