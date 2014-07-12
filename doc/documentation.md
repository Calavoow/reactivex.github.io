---
title: Dynamic Marble Diagrams
author: Eddie Schoute
abstract: |
  \noindent Marble diagrams are used extensively for explaining the functionality of Reactive Extensions (Rx) operators.
  So far these have been static images, which results in misunderstandings among new users of Rx.
  To resolve this problem a Typescript framework is proposed with which to build dynamic marble diagrams.
  These diagrams greatly enhance the learning process of new users,
  while also providing a more interactive and fun way to first experience Rx.
---

# Introduction
Marble diagrams are frequently used to explain the way operators function in the Reactive Extensions (Rx) world.
So far marble diagrams have been static images that are manually crafted
and represent a sequence of events on the input of an operator and the resulting output.
For a lot of operators this works well enough, allowing the user to quickly understand the basic principles graphically.
Extensive work has been performed on creating documentation of the operators and their accompanying marble diagrams
in e.g. the [RxJava Wiki](http://github.com/Netflix/RxJava/wiki) and the [Introduction to Rx](http://www.introtorx.com/) website.

However, it is hard to even explain some simple operators in static images, such as the amb operator shown below.
Furthermore, when more in-depth understanding of the operators is required,
such as behaviour on errors or other edge cases,
then static images fall short.

![The marble diagram of the amb operator, as provided on the RxJava Wiki.
It does not show what the amb operator means.](amb.png)

Dynamic marble diagrams allow the user to interact with the operator and gain a deeper understanding of its functioning.
If the user is concerned about certain edge cases, it is possible recreate the envisioned situation and see what happens very easily,
with no coding required.
Some hard to explain operators are easy to grasp, once you can play with them.
In these cases an interactive diagram speaks a thousand words!
Reading the documentation is no longer necessary for grasping the functionality of an operator,
but only for the way it is accessible trough the respective Rx API.

This project has as goals to provide easy to use dynamic marble diagrams,
to which the user can add or remove events, errors and completions.
The marble diagrams should always show a technically correct representation of the operator.
They also should promote a good first impression of Rx and a deeper understanding of the operators.

# Design
The project is designed to use dynamic drawing features of the HTML canvas plus Javascript,
to give a web-based example for visitors of the ReactiveX website.
Each operator will have its own canvas, which will have some additional functionality surrounding it,
such as a menu for selection the event type and a button to generate JSON.
The project will initially support major browsers of the target audience, Firefox and Chrome.

## Canvas
The canvas will be the main feature of the dynamic marble diagram.
A default marble diagram is drawn to give a first impression without interaction
and also allow the creator to craft an interesting case of the operator.
The marble diagram is drawn with a similar style as used by the RxJava wiki,
using shapes of marbles to specify event types.
Crosses will be used to designate errors, and a straight short line designates completions.
The outline of the cursor will become red when the user mouses over a location where a notification would be illegal.
If possible, a mouse click on this location will remove any events below the mouse that makes this location illegal.

## Shape Menu
The shape menu allows users unfamiliar with the marble diagram concept to quickly grasp how to interact with the marble diagram.
The project also supports the use of hotkeys for entering Error and Complete events,
but hotkeys are not user-friendly for new users.
This is why a menu is needed that shows all marble diagram shapes that can be used in the current operator,
so that the user knows his options and can select and try them out at will.

## JSON Output
When the user has created an interesting scenario,
the interactive marble diagram will also give him the option to save the corresponding output for later testing.
The outputted file is formatted as a JSON file similar to the input files,
with which the default scenario is created (see e.g. [merge](../operators/premade/merge.json)).
The output will only be shown when a button is pressed, so that it does not take up much space when the feature is unused,
as it can be quite lengthy.

# Implementation
At first the project started of as a Javascript project where the basic functionality of a marble diagram drawer was added, as provided by Georgi Khomeriki.
The basic implementation supported only the merge operator and the adding and removal of Notifications using the mouse.
Then the project was converted to a Coffeescript project because of the syntax features.
Generalizations of the code were implemented that supported a larger variety of operators, events and
a more modular approach where any operator could be added to by a contributor.
At last the switch was made to Typescript on advice of Erik Meijer,
with the added benefit of static typechecking which can be very convenient and better support for the language.
Then the project was cleaned up and examples for amb and groupBy operators was added.
GroupBy required further generalisations of streams, that have the possibility to be drawn at an angle,
as well as a dynamic canvas height.

## Generalised Stream
The stream of events is stored in a custom object, the Stream.
This object can generate an RxJS Observable and can also be generated from an Observable.
This abstract object also includes an interface for drawing functionality of the contents of the Stream.
Any inheriting streams can implement this functionality and provide their own implementation,
which can be used to support a wide variety of Stream types.

An alternative implementation, which hasn't been investigated yet, simply uses the RxJS Observable and subscribes drawing functions to that Observable.
This way one step is avoided in the process of drawing an Observable, the transformation to a general stream.

## Supporting More Operators
Every operator is has its own HTML elements which are found by the operator-specific code and passed to the generic Marble diagram drawer.
The main features an operator extension have to add are the following:

* HTML elements, bindings and a premade .json file.
* A Stream implementation that supports drawing of the output stream type.
* A function that converts the input stream(s) to an output stream.

The last two are most of the work, because the output stream can have some specific requirements.
If we look at the example of GroupBy it is apparent that the output stream is not simply a Stream of Events, but instead a Stream of Streams of Events.
Thus an output stream has to be implemented which supports Streams as elements and draws them accordingly.
The streams are drawn at a $45$ degree angle from the main stream using some vector mathematics,
which are implemented in the generic framework.

## Reactive User Input
To eliminate global variables there needed to be support for executing functions depending on a user action and the last mouse location.
The *sample* operator on Observable came very close, but this does not fire an event when no new event has occurred on the sampled stream.
However, the use case required that on every keyboard event for adding an Error or Completion to a Stream,
a function would be called with the latest mouse position.
To that end the sample operator was modified under the name *triggeredObservable*,
which fulfills this exact use case.
All user events are now handled using reactive functions.

# Results
The implementation currently supports the *amb*, *merge* and *groupBy* operators which can be seen in action on [the website](http://calavoow.github.io/reactivex.github.io/operators/).
According to the project goals, every expected operation is supported,
giving the user complete freedom on how to interact with these operators.
At all times a functionally correct view of the marble diagram should be given.
The user is given feedback using a red outline if the current placement of the marble is legal or not, or will remove another marble.
The arrows and colors of marbles clarify what marbles cause which outputs.
Moreover, an initial view is created that can be crafted by the creator of the operator diagram to give the user a first impression.
A menu next to the canvas is displayed with all possible entries on the input streams,
as well as a generate JSON button.

# Conclusion
The dynamic marble diagram supports all of the intended project features and design specifications.
It is easy to use and gives a clear view of the marble operator.
A user can easily add or remove notifications, errors or completion events to the input streams.
The representation is at all times functionally correct.
Thus the marble drawer gives a good impression to any user looking into the functionality of Rx operators.
Give the interactive marble drawer a try at [the website](http://calavoow.github.io/reactivex.github.io/operators)!

Adding more operators will prove the usefulness of the marble drawer and also bring to light its issues,
as more unique problems will pop up to support the drawing of every operator.
Potentially a rework of the way Observable are unpacked into Streams could pay off as described in the [Generalised Stream] section.
