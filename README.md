# Complete My Series
Find audiobooks missing from a series you own. This works for Audible series only.

I host a version of this at https://completeseries.lily-pad.uk if you don't want to roll out your own web service.

This is an initial draft of the code, very poorly written and horribly laid out. It will need a full refactor to be a viable long term product.

# Use
On the form page enter your AudiobookShelf server URL, username and password. These are required to get a list of audiobooks and series from your AudiobookShelf server.
By default it's expected that if you own a book in a series with a title you don't want any repeated titles. Unticking this option will allow duplicate names in a book series to be brought through.
It is assumed you only want to see missing unabridged titles.

Once logged in the service makes calls to https://audimeta.de to get information about the series and books within them. It achieves this by finding the first book you have in each series and makes a request to https://audimeta.de to get the full book information. From here the exact series ASIN (unique id) is grabbed and then a further request is made to get all of the books in the series.

Once all of the books are found a unique array is made that contains only books missing from your series collection.

These missing books are then displayed on a results page. Clicking the series icon (first book icon in the series you are missing) it will open a modal to show all of the missing books. Clicking a book will take you to the books Audible page to allow you to buy it.

Clicking the eye icon will mask the book or series and add it to the modal on the left (accessed via the burger menu) and will remove it from all subsequent requests. E.g. I own a sherlock holms book but have no interest in any more (and there are over 100) so hiding this reduces the bandwidth and doesn't clutter up the page. 
Individual books can also be removed from the returned results.
The list of hidden books and series is stored in a cookie that is read when the page opens.
Any changes to the hidden / unhidden books will be visible when you login again and reload the results page.

# Home page

# Results page

# Book modal

# Hide books

# Hide Series

# Hidden books and series panel
