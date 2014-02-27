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

Code snippet:

{% highlight ruby %}
def print_hi(name)
  puts "Hi, #{name}"
end
print_hi('Tom')
#=> prints 'Hi, Tom' to STDOUT.
{% endhighlight %}

