pragma solidity 0.5.16;

import '../math/MinKeyValueHeap.sol';

contract MinKeyValueHeapMock
{
  using MinKeyValueHeap for MinKeyValueHeap.Heap;
  MinKeyValueHeap.Heap heap;

  function insert(
    uint _key,
    uint _value
  ) public
  {
    heap.insert(_key, _value);
  }

  function removeMin() public
  {
    heap.removeMin();
  }

  function isEmpty() public view
    returns(bool)
  {
    return heap.isEmpty();
  }

  function getMin() public view
    returns(uint key, uint value)
  {
    return heap.getMin();
  }

  function getMax() public view
    returns(uint key, uint value)
  {
    return heap.getMax();
  }

  function setMaxValue(
    uint _value
  ) public
  {
    heap.setMaxValue(_value);
  }

  function getHeapKeys() public view
    returns(uint[] memory)
  {
    return heap.getHeapKeys();
  }

  function getHeapValues() public view
    returns(uint[] memory)
  {
    return heap.getHeapValues();
  }
}