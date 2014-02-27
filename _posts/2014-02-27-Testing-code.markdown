---
layout: post
title:  "Testing code"
date:   2014-02-27 01:49:44
categories: ReactiveX update
---

<div id="tabs">
  <ul>
    <li><a href="#tabs-1">Java</a></li>
    <li><a href="#tabs-2">Ruby</a></li>
    <li><a href="#tabs-3">Scala</a></li>
    <li><a href="#tabs-4">C</a></li>
  </ul>
  <div id="tabs-1">
{% highlight java %}
// says hello
public class Main {
    public static void main(String[] args) {
        System.out.println("hello, world");
    }
}
{% endhighlight %}
  </div>
  <div id="tabs-2">
{% highlight ruby %}
def print_hi(name)
  puts "Hi, #{name}"
end
print_hi('Tom')
#=> prints 'Hi, Tom' to STDOUT.
{% endhighlight %}
  </div>
  <div id="tabs-3">
{% highlight scala %}
object HelloWorld {
  def main(args: Array[String]) {
    println("hello, world")
  }
}
{% endhighlight %}
  </div>
  <div id="tabs-4">
{% highlight cpp %}
// hello, world
int main(void)
{
    printf("hello, world\n");
    return 0;
}
{% endhighlight %}
  </div>
</div>

