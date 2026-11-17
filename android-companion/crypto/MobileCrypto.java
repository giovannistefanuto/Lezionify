package it.lezionify.mobile;

import java.nio.charset.StandardCharsets;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/** AES-GCM counterpart of electron/main/mobileStatisticsCrypto.ts. */
public final class MobileCrypto {
    private static final byte[] AAD = "lezionify-mobile-statistics-v1".getBytes(StandardCharsets.UTF_8);
    private MobileCrypto() {}

    public static byte[] decrypt(byte[] key, byte[] nonce, byte[] ciphertext, byte[] tag) throws Exception {
        if (key.length != 32 || nonce.length != 12 || tag.length != 16 || ciphertext.length > 256 * 1024)
            throw new IllegalArgumentException("Messaggio non valido");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, nonce));
        cipher.updateAAD(AAD);
        byte[] input = new byte[ciphertext.length + tag.length];
        System.arraycopy(ciphertext, 0, input, 0, ciphertext.length);
        System.arraycopy(tag, 0, input, ciphertext.length, tag.length);
        return cipher.doFinal(input);
    }
}
