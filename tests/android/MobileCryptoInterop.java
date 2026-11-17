import it.lezionify.mobile.MobileCrypto;
import java.util.Base64;
import java.nio.charset.StandardCharsets;

/** Executed against synthetic Node-produced ciphertext, never personal data. */
public class MobileCryptoInterop {
    public static void main(String[] args) throws Exception {
        Base64.Decoder decoder = Base64.getDecoder();
        byte[] key = decoder.decode(args[0]), nonce = decoder.decode(args[1]);
        byte[] encrypted = decoder.decode(args[2]), tag = decoder.decode(args[3]);
        String result = new String(MobileCrypto.decrypt(key, nonce, encrypted, tag), StandardCharsets.UTF_8);
        if (!result.equals("lezionify interop test")) throw new AssertionError("Mismatch");
        tag[0] ^= 1;
        try {
            MobileCrypto.decrypt(key, nonce, encrypted, tag);
            throw new AssertionError("Tampered tag accepted");
        } catch (javax.crypto.AEADBadTagException expected) {
            System.out.println("Node-Java AES-GCM interoperability and tamper check passed");
        }
    }
}
