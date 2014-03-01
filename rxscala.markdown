---
layout: rxflavor
title: ReactiveX - RxScala
flavor: RxScala
lang: scala
repo: https://github.com/Netflix/RxJava/tree/master/language-adaptors/rxjava-scala
---

RxScala brings <em>Reactive Extensions</em> to Scala. Rx was first implemented for <a href="https://rx.codeplex.com">.NET</a>, and is now being implemented in <a href="https://github.com/Netflix/RxJava">Java</a>. The RxScala project is an adaptor for RxJava. Its code is in a <a href="https://github.com/Netflix/RxJava/tree/master/language-adaptors/rxjava-scala">subdirectory</a> of the RxJava repository, and it’s also distributed from there on <a href="http://search.maven.org/#search%7Cga%7C1%7Ca%3A%22rxjava-scala%22">Maven Central</a>.

Get started by looking at <a href="https://github.com/Netflix/RxJava/blob/master/language-adaptors/rxjava-scala/src/examples/scala/rx/lang/scala/examples/RxScalaDemo.scala">RxScalaDemo.scala</a>, the <a href="https://github.com/RxScala/RxScalaExamples">RxScalaExamples</a>, or the <a href="http://rxscala.github.io/scaladoc/index.html#rx.lang.scala.Observable">Scaladoc</a>.

There’s also a <a href="http://rxscala.github.io/comparison.html">comparison table</a> between Java Observable and Scala Observable.

<h2>Warning</h2>
This library is not yet finished. You have to expect breaking changes in future versions.

<h2>Binaries</h2>
Binaries and dependency information can be found at <a href="http://search.maven.org/#search%7Cga%7C1%7Ca%3A%22rxjava-scala%22">http://search.maven.org</a>.

Example for sbt:
{% highlight scala %}
libraryDependencies ++= Seq(
  "com.netflix.rxjava" % "rxjava-scala" % "x.y.z"
)
{% endhighlight %}

Note that `rxjava-scala` depends on `rxjava-core`, so if you download the jars manually, don’t forget `rxjava-core`.

<h2>Communication</h2>
Just use the same communication channels as for RxJava:

<ul>
    <li>Google Group: <a href="http://groups.google.com/d/forum/rxjava">RxJava</a></li>
    <li>Twitter: <a href="http://twitter.com/RxJava">@RxJava</a></li>
    <li><a href="https://github.com/Netflix/RxJava/issues">GitHub Issues</a></li>
</ul>

