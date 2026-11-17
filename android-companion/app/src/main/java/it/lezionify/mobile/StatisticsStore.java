package it.lezionify.mobile;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.time.DayOfWeek;
import java.util.HashSet;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class StatisticsStore {
    private static final String ALIAS = "lezionify-mobile-pairing-v1";
    private static SharedPreferences prefs(Context c) { return c.getSharedPreferences("mobile", Context.MODE_PRIVATE); }
    private static byte[] decode(String s) { return Base64.decode(s, Base64.DEFAULT); }
    private static String encode(byte[] b) { return Base64.encodeToString(b, Base64.NO_WRAP); }
    private static SecretKey deviceKey() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if (!store.containsAlias(ALIAS)) {
            KeyGenerator gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            gen.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
            gen.generateKey();
        }
        return (SecretKey)store.getKey(ALIAS, null);
    }
    static synchronized void pair(Context c, String input) throws Exception {
        JSONObject p = new JSONObject(input);
        URL url = new URL(p.getString("url"));
        if (!"https".equals(url.getProtocol()) || !"raw.githubusercontent.com".equalsIgnoreCase(url.getHost()) || url.getUserInfo() != null || url.getPort() != -1 || url.getQuery() != null || url.getRef() != null) throw new IllegalArgumentException();
        String stream = p.getString("streamId");
        byte[] key = decode(p.getString("key"));
        if (!stream.matches("[a-f0-9]{32}") || key.length != 32) throw new IllegalArgumentException();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, deviceKey());
        if (!prefs(c).edit().clear().putString("url", url.toString()).putString("stream", stream)
            .putString("key", encode(cipher.doFinal(key))).putString("iv", encode(cipher.getIV())).commit()) throw new Exception();
        java.util.Arrays.fill(key, (byte)0);
    }
    private static byte[] key(Context c) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, deviceKey(), new GCMParameterSpec(128, decode(prefs(c).getString("iv", ""))));
        return cipher.doFinal(decode(prefs(c).getString("key", "")));
    }
    static synchronized void refresh(Context c) throws Exception {
        SharedPreferences p = prefs(c);
        String address = p.getString("url", "");
        if (address.isEmpty()) throw new IllegalStateException("Completa prima l'abbinamento");
        HttpURLConnection connection = (HttpURLConnection)new URL(address).openConnection();
        connection.setConnectTimeout(10000); connection.setReadTimeout(10000); connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Cache-Control", "no-cache");
        try {
            if (connection.getResponseCode() != 200) throw new Exception("Download non riuscito");
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (InputStream stream = connection.getInputStream()) {
                byte[] block = new byte[4096]; int n;
                while ((n = stream.read(block)) != -1) { if (bytes.size() + n > 350000) throw new Exception("Risposta troppo grande"); bytes.write(block, 0, n); }
            }
            JSONObject envelope = new JSONObject(bytes.toString("UTF-8"));
            if (envelope.getInt("version") != 1) throw new Exception("Versione non supportata");
            byte[] secret = key(c), plaintext;
            try { plaintext = MobileCrypto.decrypt(secret, decode(envelope.getString("nonce")), decode(envelope.getString("ciphertext")), decode(envelope.getString("tag"))); }
            finally { java.util.Arrays.fill(secret, (byte)0); }
            String json = new String(plaintext, StandardCharsets.UTF_8);
            JSONObject data = validate(json, p.getString("stream", ""));
            long previous = p.getLong("revision", 0), revision = data.getLong("revision");
            if (revision < previous || (revision == previous && !json.equals(p.getString("snapshot", "")))) throw new Exception("Revisione precedente");
            if (!p.edit().putString("snapshot", json).putLong("revision", revision).putLong("checked", System.currentTimeMillis()).commit()) throw new Exception("Salvataggio non riuscito");
        } finally { connection.disconnect(); }
    }
    private static JSONObject validate(String json, String expected) throws Exception {
        JSONObject data = new JSONObject(json);
        if (data.getInt("version") != 1 || !expected.equals(data.getString("streamId")) || data.getLong("revision") < 1) throw new Exception();
        Instant.parse(data.getString("generatedAt")); ZoneId.of(data.getString("timeZone"));
        JSONArray days = data.getJSONArray("days"), courses = data.getJSONArray("courses");
        if (days.length() > 40 || courses.length() > 200) throw new Exception();
        HashSet<String> dates = new HashSet<>(), codes = new HashSet<>();
        for (int i=0;i<days.length();i++) { JSONObject d=days.getJSONObject(i); String date=d.getString("date"); LocalDate.parse(date); if (!dates.add(date) || d.getLong("seconds") < 0 || d.getLong("seconds") > 9007199254740991L) throw new Exception(); }
        for (int i=0;i<courses.length();i++) { JSONObject course=courses.getJSONObject(i); String code=course.getString("code"); if (code.isEmpty() || code.length()>200 || !codes.add(code) || course.getInt("remaining")<0 || course.getInt("remaining")>100000) throw new Exception(); }
        return data;
    }
    static String summary(Context c) {
        String raw = prefs(c).getString("snapshot", "");
        if (raw.isEmpty()) return "Apri Lezionify e abbina il PC.";
        try {
            JSONObject data = validate(raw, prefs(c).getString("stream", ""));
            ZoneId zone=ZoneId.of(data.getString("timeZone")); Instant generated=Instant.parse(data.getString("generatedAt"));
            LocalDate date=generated.atZone(zone).toLocalDate(), monday=date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            long today=0, week=0, month=0; JSONArray days=data.getJSONArray("days");
            for(int i=0;i<days.length();i++) { JSONObject item=days.getJSONObject(i); LocalDate d=LocalDate.parse(item.getString("date")); long s=item.getLong("seconds"); if(d.equals(date)) today+=s; if(!d.isBefore(monday)&&!d.isAfter(date)) week+=s; if(d.getYear()==date.getYear()&&d.getMonth()==date.getMonth()&&!d.isAfter(date)) month+=s; }
            StringBuilder out=new StringBuilder("Al ").append(date).append("\nOggi  ").append(duration(today)).append("   ·   Settimana  ").append(duration(week)).append("\nMese  ").append(duration(month));
            JSONArray courses=data.getJSONArray("courses");
            for(int i=0;i<courses.length();i++) { JSONObject course=courses.getJSONObject(i); out.append("\n").append(course.getString("code")).append("  ·  ").append(course.getInt("remaining")).append(" da completare"); }
            out.append("\nDati generati: ").append(generated.atZone(zone).toLocalDateTime().toString().replace('T', ' '));
            return out.toString();
        } catch(Exception e) { return "Dati non disponibili. Apri Lezionify."; }
    }
    private static String duration(long seconds) { return (seconds / 3600) + " h " + ((seconds % 3600) / 60) + " min"; }
}
