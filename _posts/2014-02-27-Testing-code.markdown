---
layout: post
title:  "Testing code"
date:   2014-02-27 01:49:44
categories: ReactiveX update
---

<tabset>
  <tab heading="Java">
{% highlight java %}
// says hello
public class Main {
    public static void main(String[] args) {
        System.out.println("hello, world");
    }
}
{% endhighlight %}
  </tab>
  <tab heading="Ruby">
{% highlight ruby %}
def print_hi(name)
  puts "Hi, #{name}"
end
print_hi('Tom')
#=> prints 'Hi, Tom' to STDOUT.
{% endhighlight %}
  </tab>
  <tab heading="Scala">
{% highlight scala %}
object HelloWorld {
  def main(args: Array[String]) {
    println("hello, world")
  }
}
{% endhighlight %}
  </tab>
  <tab heading="C++">
{% highlight cpp %}
// hello, world
int main(void)
{
    printf("hello, world\n");
    return 0;
}
{% endhighlight %}
  </tab>
</tabset>
