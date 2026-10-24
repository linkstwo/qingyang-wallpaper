package android.os;
import java.util.*;
public class Looper {
 public static long now=1000; static Looper current; static List<Job> jobs=new ArrayList<>(); public boolean closed;
 static class Job { Looper owner; Runnable run; long due; Job(Looper o,Runnable r,long d){owner=o;run=r;due=d;} }
 public static Looper myLooper(){return current;}
 public static void on(Looper l,Runnable r){Looper old=current;current=l;try{r.run();}finally{current=old;}}
 public static void advance(long ms){long end=now+ms;int guard=0;while(true){Job j=jobs.stream().filter(x->!x.owner.closed && x.due<=end).min(Comparator.comparingLong(x->x.due)).orElse(null);if(j==null)break;if(++guard>10000)throw new AssertionError("busy loop");jobs.remove(j);now=j.due;on(j.owner,j.run);}now=end;}
 public static int pending(){return (int)jobs.stream().filter(x->!x.owner.closed).count();}
}