package game.devbangs.pipistrelle;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // the app's own plugin: ads through Google AdMob (PipAdsPlugin)
        registerPlugin(PipAdsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
