// Create a separate, debuggable research copy. Business DEX files stay unchanged.
import com.reandroid.apk.ApkModule;
import com.reandroid.arsc.chunk.xml.AndroidManifestBlock;
import com.reandroid.arsc.chunk.xml.ResXmlElement;
import com.reandroid.arsc.chunk.xml.ResXmlAttribute;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Set;

class PrepareDiagnosticCopy {
    public static void main(String[] args) throws Exception {
        ApkModule apk = ApkModule.loadApkFile(new File(args[0]));
        AndroidManifestBlock manifest = apk.getAndroidManifestBlock();
        String original = manifest.getPackageName();
        String research = "com.sanjixiuxue.research.zen20261020";
        Set<String> components = Set.of("application", "activity", "activity-alias", "service", "receiver", "provider", "instrumentation");
        Iterator<ResXmlElement> nodes = manifest.getManifestElement().recursiveElements();
        while (nodes.hasNext()) {
            ResXmlElement node = nodes.next();
            Iterator<ResXmlAttribute> attributes = node.getAttributes();
            while (attributes.hasNext()) {
                ResXmlAttribute attr = attributes.next();
                String name = attr.getName();
                String value = attr.getValueAsString();
                if (value == null) continue;
                boolean className = (name.equals("name") && components.contains(node.getName()))
                    || name.equals("targetActivity") || name.equals("parentActivityName")
                    || name.equals("backupAgent") || name.equals("manageSpaceActivity");
                if (className) {
                    if (value.startsWith(".")) attr.setValueAsString(original + value);
                    else if (!value.contains(".")) attr.setValueAsString(original + "." + value);
                } else if (!name.equals("appComponentFactory") && value.contains(original)) {
                    attr.setValueAsString(value.replace(original, research));
                }
            }
        }
        apk.setPackageName(research);
        manifest.setDebuggable(true);
        manifest.setApplicationLabel("菩提导航·调研");
        apk.refreshManifest();
        apk.writeApk(new File(args[1]));
        Files.writeString(Path.of(args[2]), manifest.serializeToXml());
        System.out.println("Prepared " + manifest.getPackageName() + ", debuggable=" + manifest.isDebuggable());
        apk.close();
    }
}
