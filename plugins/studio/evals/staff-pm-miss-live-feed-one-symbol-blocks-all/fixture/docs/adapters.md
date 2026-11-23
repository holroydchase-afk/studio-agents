# Adapters

`cboe.py`: fetch the options chain for a symbol, return calls and puts. The saved samples hold calls and puts for three symbols.
Symbols come from the user's watchlist (about 40). The adapter is called once per symbol in a loop.
