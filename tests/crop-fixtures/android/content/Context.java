package android.content;
public class Context {
    public static final int MODE_PRIVATE=0;
    private final SharedPreferences p=new SharedPreferences();
    public SharedPreferences getSharedPreferences(String n,int mode){return p;}
}
