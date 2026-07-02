export const POS_POOL_ABI = [
  {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'userSummary',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'votes', type: 'uint256' },
          { internalType: 'uint256', name: 'available', type: 'uint256' },
          { internalType: 'uint256', name: 'locked', type: 'uint256' },
          { internalType: 'uint256', name: 'unlocked', type: 'uint256' },
          { internalType: 'uint256', name: 'claimedInterest', type: 'uint256' },
          { internalType: 'uint256', name: 'currentInterest', type: 'uint256' },
        ],
        internalType: 'struct IPoSPool.UserSummary',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_address', type: 'address' }],
    name: 'userInterest',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'userInQueue',
    outputs: [
      {
        components: [
          { internalType: 'uint64', name: 'votePower', type: 'uint64' },
          { internalType: 'uint64', name: 'endBlockNumber', type: 'uint64' },
        ],
        internalType: 'struct VotePowerQueue.QueueNode[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'userOutQueue',
    outputs: [
      {
        components: [
          { internalType: 'uint64', name: 'votePower', type: 'uint64' },
          { internalType: 'uint64', name: 'endBlockNumber', type: 'uint64' },
        ],
        internalType: 'struct VotePowerQueue.QueueNode[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'userLockInfo',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'unlockBlockNumber', type: 'uint256' },
        ],
        internalType: 'struct IVotingEscrow.LockInfo',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'poolSummary',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'available', type: 'uint256' },
          { internalType: 'uint256', name: 'interest', type: 'uint256' },
          { internalType: 'uint256', name: 'totalInterest', type: 'uint256' },
        ],
        internalType: 'struct IPoSPool.PoolSummary',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'poolAPY',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'poolName',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint64', name: 'votePower', type: 'uint64' }],
    name: 'increaseStake',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint64', name: 'votePower', type: 'uint64' }],
    name: 'decreaseStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimAllInterest',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint64', name: 'votePower', type: 'uint64' }],
    name: 'withdrawStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
