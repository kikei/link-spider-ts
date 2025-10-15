class KeyedSet<T> {
  private keyExtractor: (item: T) => string;
  private map: Map<string, T>;

  /**
   * Create a new KeyedSet instance.
   * @param options - Configuration options.
   * @param options.keyExtractor - Function to extract the key
   * for each item.
   */
  constructor({ keyExtractor }: { keyExtractor: (item: T) => string }) {
    if (typeof keyExtractor !== 'function') {
      throw new Error('keyExtractor must be a function');
    }
    this.keyExtractor = keyExtractor;
    this.map = new Map();
  }

  /**
   * Add an item to the set.
   * @param item - The item to add.
   * @returns The current instance.
   */
  add(item: T): KeyedSet<T> {
    const key = this.keyExtractor(item);
    if (!this.map.has(key)) {
      this.map.set(key, item);
    }
    return this;
  }

  /**
   * Check if a key exists in the set.
   * @param key - The key to check.
   * @returns True if the key exists, false otherwise.
   */
  has(key: string): boolean {
    return this.map.has(key);
  }

  /**
   * Remove an item by its key.
   * @param key - The key of the item to remove.
   * @returns True if the item was removed, false otherwise.
   */
  delete(key: string): boolean {
    return this.map.delete(key);
  }

  /**
   * Pop the first item from the set.
   * @returns The first item in the set.
   */
  pop(): T | undefined {
    const iterator = this.map.values();
    const firstValue = iterator.next().value;
    if (firstValue) {
      this.delete(this.keyExtractor(firstValue));
    }
    return firstValue;
  }

  /**
   * Clear all items from the set.
   */
  clear(): void {
    this.map.clear();
  }

  /**
   * Get the size of the set.
   * @returns The number of items in the set.
   */
  size(): number {
    return this.map.size;
  }

  /**
   * Execute a callback function for each item in the set.
   * @param callback - The callback function.
   */
  forEach(
    callback: (value: T, key: string, map: Map<string, T>) => void
  ): void {
    this.map.forEach(callback);
  }

  /**
   * Get an iterator for the set values.
   * @returns An iterator for the set values.
   */
  [Symbol.iterator](): IterableIterator<T> {
    return this.map.values();
  }
}

export default KeyedSet;
