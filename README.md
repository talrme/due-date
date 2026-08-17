# Due Date

**Live site:** [https://talrme.github.io/due-date/](https://talrme.github.io/due-date/)

A small interactive website for mapping Epic Research gestational-age delivery frequencies onto a selected due date.

Live locally by opening `index.html` in a browser.

## What It Does

- Saves the selected due date in browser localStorage by default
- Lets you show first delivery, second-or-later delivery, daily probability density, and cumulative probability
- Adds optional median and due-date reference markers on the chart
- Renders week/day x-axis labels from 37w0d through 42w4d
- Shows a cumulative probability table by calendar date
- Includes a settings modal for browser memory, table visibility, and curve style
- Clicking the banner resets saved settings

## Source

The dataset is taken from the frequency table in Epic Research's article:

https://www.epicresearch.org/articles/data-confirms-firstborns-take-their-time-younger-siblings-born-sooner/

The table values are rounded percentages, so cumulative values are normalized within the visible 37w0d to 42w4d window.
