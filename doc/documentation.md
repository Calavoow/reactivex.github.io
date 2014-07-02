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

# Implementation

# Results

# Conclusion
