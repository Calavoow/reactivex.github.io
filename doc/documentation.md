---
title: Dyanimc Marble Diagrams
author: Eddie Schoute
abstract: |
  \noindent Marble diagrams are used extensively for explaining the functionality of Reactive Extensions (Rx) operators.
  So far these have been static images, which results in misunderstandings among new users of Rx.
  To resolve this problem I have made a Typescript framework with which to build dynamic marble diagrams.
  These diagrams greatly enhance the learning process of new users,
  while also providing a more interactive and fun way to first experience Rx.
---

# Introduction
Marble diagrams are frequently used to explain the way operators function in the Reactive Extensions (Rx) world.
So far marble diagrams are static images which crafted manually which represent a sequence of events on the input of an operator,
and the resulting sequence of events on the output.
For a lot of operators this works well enough, and allows the user to quickly understand the basic principles graphically.
Extensive work has been performed on creating documentation of the operators in e.g. the [RxJava Wiki](http://github.com/Netflix/RxJava/wiki) and the [Introduction to Rx](http://www.introtorx.com/) website.

However, it is hard to even explain some simple operators in static images, such as the amb operator shown below.
Additionally, when more in-depth understanding of the operators is required,
such as behaviour on errors or other edge cases,
then static images fall short.

![The marble diagram of the amb operator, as provided on the RxJava Wiki.
It does not show what the amb operator means.](amb.png)

Dynamic marble diagrams allow the user to interact with the operator and gain a deeper understanding of its functioning.
If the user is concerned about certain edge cases, it is possible recreate the situation and see what happens very easily.
Some hard to explain operators are easy to grasp, once you can play with them.
Reading the documentation is no longer necessary for grasping the functionality of an operator,
but only for the way it is structured in the API.

This project has as goals to provide easy-to-use dynamic marble diagrams,
to which the user can add or remove events, errors and completions.
The marble diagrams should always show a technically correct representation of the operator.
They also should promote a good first impression of Rx and a deeper understanding of the operators.

# Design
The project is designed to use dynamic drawing features of the HTML canvas plus Javascript, 
to give a web-based example for visitors of the ReactiveX website.
Each operator will have its own canvas, which will have some additional functionality surrounding it,
such as a menu for selection the event type and a button to generate JSON.
The project also supports major browsers of the target audience, Firefox and Chrome.

## Canvas
The canvas will be the main feature of the dynamic marble diagram.
A default marble diagram is drawn to give a first impression without interaction
and also allow the creator to craft an interesting case of the marble diagram.
The marble diagram is drawn with a similar style as used by the RxJava wiki,
using shapes of marbles to specify event types.

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
At first the project started of as a Javascript project where the basic functionality of a marble diagram drawer was added.
The basic implementation supported only the merge operator and the adding and removal of Notifications using the mouse.
Then the project was converted to a Coffeescript project because of the syntax features.
Consequently the project was generalised to allow for a larger variety of operators and 
a more modular approach where any operator could be added to by a contributor.
However, at last I switched to Typescript on advice of Erik Meijer,
with the added benefit of static typechecking which can be very convenient and better support for the language.

## Generalised Stream 
The stream of events is stored in a custom object, the Stream.
This object can generate an RxJS Observable and can also be generated from an Observable.
The object also includes drawing functionality of the contents of the Stream.
Any inheriting streams can override this functionality and provide their own implementation,
which can be used to support a wide variety of Stream types.

An alternative implementation, which hasn't been investigated yet, simply uses the RxJS Observable and subscribes drawing functions to that Observable.
This way one step is avoided in the process of drawing an Observable, the transformation to a Stream.


# Results

# Conclusion
