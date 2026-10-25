package android.content;
import java.util.HashMap;
public class SharedPreferences {
    private final HashMap<String,Object> data=new HashMap<>();
    public int getInt(String k,int d){return data.containsKey(k)?(Integer)data.get(k):d;}
    public String getString(String k,String d){return data.containsKey(k)?(String)data.get(k):d;}
    public boolean getBoolean(String k,boolean d){return data.containsKey(k)?(Boolean)data.get(k):d;}
    public Editor edit(){return new Editor();}
    public class Editor {
        private final HashMap<String,Object> pending=new HashMap<>();
        public Editor putInt(String k,int v){pending.put(k,v);return this;}
        public Editor putString(String k,String v){pending.put(k,v);return this;}
        public Editor putBoolean(String k,boolean v){pending.put(k,v);return this;}
        public void apply(){data.putAll(pending);}
    }
}
