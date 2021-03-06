---
layout: rxflavor
title: ReactiveX - RxJava
flavor: RxJava
lang: java
repo: https://github.com/Netflix/RxJava
---

RxJava is a Java VM implementation of <a href="https://rx.codeplex.com">Reactive Extensions</a>: a library for composing asynchronous and event-based programs by using observable sequences.

It extends the <a href="http://en.wikipedia.org/wiki/Observer_pattern">observer pattern</a> to support sequences of data/events and adds operators that allow you to compose sequences together declaratively while abstracting away concerns about things like low-level threading, synchronization, thread-safety, concurrent data structures, and non-blocking I/O.

It supports Java 5 or higher and JVM-based languages such as <a href="{{ site.baseurl }}/rxgroovy/">Groovy</a>, <a href="{{ site.baseurl }}/rxclojure/">Clojure</a>, <a href="{{ site.baseurl }}/rxjruby/">JRuby</a>, <a href="{{ site.baseurl }}/rxkotlin/">Kotlin</a> and <a href="{{ site.baseurl }}/rxscala/">Scala</a>.

<center><table>
 <thead>
  <tr><th colspan="3">Observables fill the gap by being the ideal implementation of access to asynchronous sequences of multiple items</th></tr>
  <tr><th></th><th>single items</th><th>multiple items</th></tr>
 </thead>
 <tbody>
  <tr><th>synchronous</th><td><code>T getData()</code></td><td><code>Iterable&lt;T&gt; getData()</code></td></tr>
  <tr><th>asynchronous</th><td><code>Future&lt;T&gt; getData()</code></td><td><code>Observable&lt;T&gt; getData()</code></td></tr>
 </tbody>
</table></center>
<br/>
# Why?

### Observables are Composable

<a href="http://docs.oracle.com/javase/7/docs/api/java/util/concurrent/Future.html">Java Futures</a> are straightforward to use for a <a href="https://gist.github.com/4670979">single level of asynchronous execution</a> but they start to add <a href="https://gist.github.com/4671081">non-trivial complexity</a> when they’re nested.

It is <a href="https://gist.github.com/4671081#file-futuresb-java-L163">difficult to use Futures to optimally compose conditional asynchronous execution flows</a> (or impossible, since latencies of each request vary at runtime). This <a href="http://www.amazon.com/gp/product/0321349601?ie=UTF8&tag=none0b69&linkCode=as2&camp=1789&creative=9325&creativeASIN=0321349601">can be done</a>, of course, but it quickly becomes complicated (and thus error-prone) or it prematurely blocks on `Future.get()`, which eliminates the benefit of asynchronous execution.

RxJava Observables on the other hand are intended for [composing flows and sequences of asynchronous data](https://github.com/Netflix/RxJava/wiki/How-To-Use#composition).

### Observables are Flexible

RxJava’s Observables support not just the emission of single scalar values (as Futures do), but also of sequences of values or even infinite streams. ``Observable`` is a single abstraction that can be used for any of these use cases. An Observable has all of the flexibility and elegance associated with its mirror-image cousin the Iterable.

<center><table>
 <thead>
  <tr><th colspan="3">An Observable is the asynchronous/push <a href="http://en.wikipedia.org/wiki/Dual_(category_theory)">"dual"</a> to the synchronous/pull Iterable</th></tr>
  <tr><th>event</th><th>Iterable (pull)</th><th>Observable (push)</th></tr>
 </thead>
 <tbody>
  <tr><td>retrieve data</td><td><code>T next()</code></td><td><code>onNext(T)</code></td></tr>
  <tr><td>discover error</td><td>throws <code>Exception</code></td><td><code>onError(Exception)</code></td></tr>
  <tr><td>complete</td><td>returns</td><td><code>onCompleted()</code></td></tr>
 <tbody>
</table></center>

### Observables are Less Opinionated

The RxJava implementation is not biased toward some particular source of concurrency or asynchronicity. Observables in RxJava can be implemented using thread-pools, event loops, non-blocking I/O, actors (such as from Akka), or whatever implementation suits your needs, your style, or your expertise. Client code treats all of its interactions with Observables as asynchronous, whether your underlying implementation is blocking or non-blocking and however you choose to implement it.

RxJava also tries to be very lightweight. It is implemented as a single JAR that is focused on just the Observable abstraction and related higher-order functions. You could implement a composable Future that is similarly unbiased, but <a href="http://doc.akka.io/docs/akka/2.2.0/java.html">Akka Futures</a> for example come tied in with an Actor library and a lot of other stuff.)

<center><table>
 <thead>
  <tr><th>How is this Observable implemented?</th></tr>
  <tr><th><code>public Observable<data> getData();</code></th></tr>
 </thead>
 <tfoot>
  <tr><th>From the Observer's point of view, it doesn't matter!</Th.></tr>
 </tfoot>
 <tbody>
  <tr><td><ul>
<li>does it work sychronously on the same thread as the caller?</li>
<li>does it work asynchronously on a distinct thread?</li>
<li>does it divide its work over multiple threads that may return data to the caller in any order?</li>
<li>does it use an Actor (or multiple Actors) instead of a thread pool?</li>
<li>does it use NIO with an event-loop to do asynchronous network access?</li>
<li>does it use an event-loop to separate the work thread from the callback thread?</li>
</ul></td></tr>
 </tbody>
</table></center>

And importantly: with RxJava you can later change your mind, and radically change the underlying nature of your Observable implementation, without breaking the consumers of your Observable.

### Callbacks Have Their Own Problems

Callbacks solve the problem of premature blocking on ``Future.get()`` by not allowing anything to block. They are naturally efficient because they execute when the response is ready.

But as with Futures, while callbacks are easy to use with a single level of asynchronous execution, <a href="https://gist.github.com/4677544">with nested composition they become unwieldy</a>.

### RxJava is a Polyglot Implementation

RxJava is meant for a more polyglot environment than just Java/Scala, and it is being designed to respect the idioms of each JVM-based language. (<a href="https://github.com/Netflix/RxJava/pull/304">This is something we’re still working on.</a>)

# Functional Reactive Programming (FRP)

RxJava provides a collection of operators with which you can filter, select, transform, combine, and compose Observables. This allows for efficient execution and composition.

You can think of the Observable class as a “push” equivalent to <a href="http://docs.oracle.com/javase/7/docs/api/java/lang/Iterable.html">Iterable</a>, which is a “pull.” With an Iterable, the consumer pulls values from the producer and the thread blocks until those values arrive. By contrast, with an Observable the producer pushes values to the consumer whenever values are available. This approach is more flexible, because values can arrive synchronously or asynchronously.

<table>
 <thead>
  <tr><th colspan="2">Example code showing how similar high-order functions can be applied to an Iterable and an Observable</th></tr>
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
</table>

The Observable type adds two missing semantics to the Gang of Four’s <a href="http://en.wikipedia.org/wiki/Observer_pattern">Observer pattern</a>, to match those that are available in the Iterable type:  

1. the ability for the producer to signal to the consumer that there is no more data available (a foreach loop on an Iterable completes and returns normally in such a case; an Observable calls its observer's ``onCompleted()`` method)
1. the ability for the producer to signal to the consumer that an error has occurred (an Iterable throws an exception if an error takes place during iteration; an Observable calls its observer's ``onError()`` method)

With these additions, RxJava harmonizes the Iterable and Observable types. The only difference between them is the direction in which the data flows. This is very important because now any operation you can perform on an Iterable, you can also perform on an Observable.

We call this approach Functional Reactive Programming because it applies functions (lambdas/closures) in a reactive (asynchronous/push) manner to asynchronous sequences of data. (This is not meant to be an implementation of the similar but more restrictive “functional reactive programming” model used in languages like <a href="http://conal.net/fran/">Fran</a>.)

# More Information

* LambdaJam Chicago 2013: [Functional Reactive Programming in the Netflix API](https://speakerdeck.com/benjchristensen/functional-reactive-programming-in-the-netflix-api-lambdajam-2013)
* QCon London 2013 presentation: [Functional Reactive Programming in the Netflix API](http://www.infoq.com/presentations/netflix-functional-rx) and [interview](http://www.infoq.com/interviews/christensen-hystrix-rxjava)
* [Functional Reactive in the Netflix API with RxJava](http://techblog.netflix.com/2013/02/rxjava-netflix-api.html)
* [RxJava: Reactive Extensions in Scala](http://www.youtube.com/watch?v=tOMK_FYJREw&feature=youtu.be) - video of Ben Christensen and Matt Jacobs presenting at SF Scala
* [Functional Reactive Programming on Android With RxJava](http://mttkay.github.io/blog/2013/08/25/functional-reactive-programming-on-android-with-rxjava/) and [Conquering concurrency - bringing the Reactive Extensions to the Android platform](https://speakerdeck.com/mttkay/conquering-concurrency-bringing-the-reactive-extensions-to-the-android-platform)
* [Top 7 Tips for RxJava on Android](http://blog.futurice.com/top-7-tips-for-rxjava-on-android) by Timo Tuominen
* [FRP on Android](http://slid.es/yaroslavheriatovych/frponandroid) by Yaroslav Heriatovych
* [Optimizing the Netflix API](http://techblog.netflix.com/2013/01/optimizing-netflix-api.html)
* [Reactive Programming at Netflix](http://techblog.netflix.com/2013/01/reactive-programming-at-netflix.html)
* [rx.codeplex.com](https://rx.codeplex.com)
* [Rx Design Guidelines (PDF)](http://go.microsoft.com/fwlink/?LinkID=205219)
* [Channel 9 MSDN videos on Reactive Extensions](http://channel9.msdn.com/Tags/reactive+extensions)
* [Your Mouse is a Database](http://queue.acm.org/detail.cfm?id=2169076)
* [Beginner’s Guide to the Reactive Extensions](http://msdn.microsoft.com/en-us/data/gg577611)
* [Wikipedia: Reactive Programming](http://en.wikipedia.org/wiki/Reactive_programming)
* [Wikipedia: Functional Reactive Programming](http://en.wikipedia.org/wiki/Functional_reactive_programming)
* [Tutorial: Functional Programming in Javascript](http://jhusain.github.io/learnrx/)  and [an accompanying lecture (video)](http://www.youtube.com/watch?v=LB4lhFJBBq0) by Jafar Husain.
* [What is (functional) reactive programming?](http://stackoverflow.com/a/1030631/1946802)
* [Rx Is now Open Source](http://www.hanselman.com/blog/ReactiveExtensionsRxIsNowOpenSource.aspx)
* [What is FRP? - Elm Language](http://elm-lang.org/learn/What-is-FRP.elm)
* [Rx Workshop: Observables vs. Events](http://channel9.msdn.com/Series/Rx-Workshop/Rx-Workshop-Observables-versus-Events)
* [Rx Workshop: Unified Programming Model](http://channel9.msdn.com/Series/Rx-Workshop/Rx-Workshop-Unified-Programming-Model)
* [Introduction to Rx: Why Rx?](http://www.introtorx.com/Content/v1.0.10621.0/01_WhyRx.html#WhyRx)
* [The Reactive Manifesto](http://www.reactivemanifesto.org/)

# RxJava Libraries

The following external libraries can work with RxJava:

* [Hystrix](https://github.com/Netflix/Hystrix/wiki/How-To-Use#wiki-Reactive-Execution) latency and fault tolerance bulkheading library.
* [Camel RX](http://camel.apache.org/rx.html) provides an easy way to reuse any of the [Apache Camel components, protocols, transports and data formats](http://camel.apache.org/components.html) with the RxJava API
* [rxjava-http-tail](https://github.com/myfreeweb/rxjava-http-tail) allows you to follow logs over HTTP, like `tail -f`
* [mod-rxjava - Extension for VertX](https://github.com/meez/mod-rxjava) that provides support for Reactive Extensions (RX) using the RxJava library

