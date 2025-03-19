import React, { useState, useEffect } from 'react';
import { 
  addToAllowList, 
  removeFromAllowList, 
  addToBlockList, 
  removeFromBlockList, 
  getAllowList, 
  getBlockList,
  normalizePhoneNumber
} from '../lib/firebase.service';

const AllowBlockListAdmin: React.FC = () => {
  const [allowList, setAllowList] = useState<string[]>([]);
  const [blockList, setBlockList] = useState<string[]>([]);
  const [newPhoneNumber, setNewPhoneNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load lists on component mount
  useEffect(() => {
    loadLists();
  }, []);

  // Load both allow and block lists
  const loadLists = async () => {
    setIsLoading(true);
    try {
      const [allowedNumbers, blockedNumbers] = await Promise.all([
        getAllowList(),
        getBlockList()
      ]);
      setAllowList(allowedNumbers);
      setBlockList(blockedNumbers);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load lists';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle phone number input change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPhoneNumber(e.target.value);
  };

  // Format phone number for display
  const formatPhoneForDisplay = (phone: string): string => {
    // Simple formatting for display purposes
    const digits = normalizePhoneNumber(phone);
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  // Add to allow list
  const handleAddToAllowList = async () => {
    if (!newPhoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await addToAllowList(newPhoneNumber);
      if (result) {
        setSuccess(`${newPhoneNumber} added to allow list`);
        setNewPhoneNumber('');
        await loadLists();
      } else {
        setError('Failed to add to allow list');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove from allow list
  const handleRemoveFromAllowList = async (phone: string) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await removeFromAllowList(phone);
      if (result) {
        setSuccess(`${phone} removed from allow list`);
        await loadLists();
      } else {
        setError('Failed to remove from allow list');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Add to block list
  const handleAddToBlockList = async () => {
    if (!newPhoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await addToBlockList(newPhoneNumber);
      if (result) {
        setSuccess(`${newPhoneNumber} added to block list`);
        setNewPhoneNumber('');
        await loadLists();
      } else {
        setError('Failed to add to block list');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove from block list
  const handleRemoveFromBlockList = async (phone: string) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await removeFromBlockList(phone);
      if (result) {
        setSuccess(`${phone} removed from block list`);
        await loadLists();
      } else {
        setError('Failed to remove from block list');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Allow/Block List Management</h1>
      
      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      {/* Add New Phone Number */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Add Phone Number</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={newPhoneNumber}
            onChange={handlePhoneChange}
            placeholder="Enter phone number"
            className="flex-grow p-2 border rounded"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddToAllowList}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Add to Allow List
            </button>
            <button
              onClick={handleAddToBlockList}
              disabled={isLoading}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Add to Block List
            </button>
          </div>
        </div>
      </div>
      
      {/* Lists Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Allow List */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Allow List</h2>
          {isLoading ? (
            <p>Loading...</p>
          ) : allowList.length === 0 ? (
            <p className="text-gray-500">No phone numbers in allow list</p>
          ) : (
            <ul className="space-y-2">
              {allowList.map((phone) => (
                <li key={phone} className="flex justify-between items-center p-2 border-b">
                  <span>{formatPhoneForDisplay(phone)}</span>
                  <button
                    onClick={() => handleRemoveFromAllowList(phone)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Block List */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Block List</h2>
          {isLoading ? (
            <p>Loading...</p>
          ) : blockList.length === 0 ? (
            <p className="text-gray-500">No phone numbers in block list</p>
          ) : (
            <ul className="space-y-2">
              {blockList.map((phone) => (
                <li key={phone} className="flex justify-between items-center p-2 border-b">
                  <span>{formatPhoneForDisplay(phone)}</span>
                  <button
                    onClick={() => handleRemoveFromBlockList(phone)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllowBlockListAdmin; 