pragma solidity 0.5.16;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

/**
 * Original source https://github.com/Dev43/heap-solidity
 */
library MinKeyValueHeap
{
  using SafeMath for uint;

  struct Heap
  {
    // We will be storing our heap in an array
    // The key is used for sorting
    uint[] keys;
    // The value will follow position with any sorting done to keys
    uint[] values;
  }

  // Inserts adds in a value to our _heap.
  function insert(
    Heap storage _heap,
    uint _key,
    uint _value
  ) internal
  {
    // On first insert, initialize the heap with 1 entry
    if(_heap.keys.length == 0)
    {
      _heap.keys.push(0);
      _heap.values.push(0);
    }

    // Add the value to the end of our array
    _heap.keys.push(_key); // TODO do we get currentIndex from this
    _heap.values.push(_value);

    // Start at the end of the array
    uint currentIndex = _heap.keys.length - 1;

    // Bubble up the value until it reaches it's correct place (i.e. it is larger than it's parent)
    while(currentIndex > 1)
    {
      uint parentIndex = currentIndex / 2;
      if(_heap.keys[parentIndex] <= _heap.keys[currentIndex])
      {
        break;
      }
      // If the parent value is higher than our current value, we swap them
      (_heap.keys[parentIndex], _heap.keys[currentIndex]) = (_key, _heap.keys[parentIndex]);
      (_heap.values[parentIndex], _heap.values[currentIndex]) = (_value, _heap.values[parentIndex]);
      // change our current Index to go up to the parent
      currentIndex = parentIndex;
    }
  }

  // RemoveMax pops off the root element of the heap (the smallest value here) and rebalances the heap
  function removeMin(
    Heap storage _heap
  ) internal
  {
    // Ensure the heap exists
    require(_heap.keys.length > 1, "HEAP_IS_EMPTY");

    // Takes the last element of the array and put it at the root
    _heap.keys[1] = _heap.keys[_heap.keys.length.sub(1)];
    _heap.values[1] = _heap.values[_heap.values.length.sub(1)];
    // Delete the last element from the array
    _heap.keys.length = _heap.keys.length.sub(1);
    _heap.values.length = _heap.values.length.sub(1);

    // Start at the top
    uint currentIndex = 1;

    // Bubble down
    while(currentIndex * 2 < _heap.keys.length.sub(1))
    {
      // get the current index of the children
      uint j = currentIndex * 2;

      // left child value
      uint leftChild = _heap.keys[j];
      // right child value
      uint rightChild = _heap.keys[j.add(1)];

      // Compare the left and right child. if the rightChild is lesser, then point j to it's index
      if (leftChild > rightChild)
      {
        j = j.add(1);
      }

      // compare the current parent value with the lowest child, if the parent is lower, we're done
      if(_heap.keys[currentIndex] < _heap.keys[j])
      {
        break;
      }

      // else swap the value
      (_heap.keys[currentIndex], _heap.keys[j]) = (_heap.keys[j], _heap.keys[currentIndex]);
      (_heap.values[currentIndex], _heap.values[j]) = (_heap.values[j], _heap.values[currentIndex]);

      // and let's keep going down the heap
      currentIndex = j;
    }
  }

  function isEmpty(
    Heap memory _heap
  ) internal pure
    returns(bool)
  {
    return _heap.keys.length <= 1;
  }

  function getMin(
    Heap memory _heap
  ) internal pure
    returns(uint key, uint value)
  {
    return (_heap.keys[1], _heap.values[1]);
  }

  // TODO: This isn't quite right
  function getMax(
    Heap memory _heap
  ) internal pure
    returns(uint key, uint value)
  {
    uint index = _heap.keys.length - 1;
    return (_heap.keys[index], _heap.values[index]);
  }

  function setMaxValue(
    Heap storage _heap,
    uint _value
  ) internal
  {
    uint index = _heap.keys.length - 1;
    _heap.values[index] = _value;
  }

  function getHeapKeys(
    Heap storage _heap
  ) internal view
    returns(uint[] memory)
  {
    return _heap.keys;
  }

  function getHeapValues(
    Heap storage _heap
  ) internal view
    returns(uint[] memory)
  {
    return _heap.values;
  }
}