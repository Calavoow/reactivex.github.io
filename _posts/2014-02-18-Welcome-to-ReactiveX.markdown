---
layout: post
title:  "Welcome to ReactiveX!"
date:   2014-02-18 14:46:44
categories: ReactiveX update
---

Markdown table:

|              | single items             | mulitple items            |
| ------------ | ------------------------ | ------------------------- |
| synchronous  | `T getData()`            | `Iterable<T> getData()`   |
| asynchronous | `Future<T> getData()`    | `Observable<T> getData()` |


HTML table:

<center>
    <table>
        <thead>
            <tr>
                <td colspan="3">Observables fill the gap by being the ideal implementation of access to asynchronous sequences of multiple items</td>
            </tr>
            <tr>
                <th></th>
                <th>single items</th>
                <th>multiple items</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <th>synchronous</th>
                <td><code>T getData()</code></td>
                <td><code>Iterable&lt;T&gt; getData()</code></td>
            </tr>
            <tr>
                <th>asynchronous</th>
                <td><code>Future&lt;T&gt; getData()</code></td>
                <td><code>Observable&lt;T&gt; getData()</code></td>
            </tr>
        </tbody>
    </table>
</center>

<center><table>
 <thead>
  <tr><td colspan="2">Example code showing how similar high-order functions can be applied to an Iterable and an Observable</td></tr>
  <tr><th>Iterable</th><th>Observable</th></tr>
 </thead>
 <tbody>
  <tr><td>
{% highlight java %}
getDataFromLocalMemory()
.skip(10)
.take(5)
.map({ s -> return s + " transformed" })
.forEach({ println "next => " + it })
{% endhighlight %}
  </td>
  <td>
{% highlight java %}
getDataFromNetwork()
.skip(10)
.take(5)
.map({ s -> return s + " transformed" })
.subscribe({ println "onNext => " + it })
{% endhighlight %}
  </td></tr>
 </tbody>
</table></center>

Code snippet:

{% highlight ruby %}
def print_hi(name)
  puts "Hi, #{name}"
end
print_hi('Tom')
#=> prints 'Hi, Tom' to STDOUT.
{% endhighlight %}

