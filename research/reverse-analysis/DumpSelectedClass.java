// Supplemental direct JADX output for REA's ambiguous anonymous-class aliases.
// This reads the APK without executing target application code.
import jadx.api.JadxArgs;
import jadx.api.JadxDecompiler;
import jadx.api.JavaClass;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;

class DumpSelectedClass {
    public static void main(String[] args) throws Exception {
        JadxArgs config = new JadxArgs();
        config.setInputFile(new File(args[0]));
        config.setThreadsCount(1);
        config.setSkipResources(true);
        try (JadxDecompiler decompiler = new JadxDecompiler(config)) {
            decompiler.load();
            for (JavaClass item : decompiler.getClasses()) {
                if (item.getFullName().equals(args[1])) {
                    String text = item.getCode();
                    Files.writeString(Path.of(args[2]), text);
                    System.out.println("Selected JADX class written; chars=" + text.length());
                    return;
                }
            }
            throw new IllegalArgumentException("Selected class not found");
        }
    }
}
