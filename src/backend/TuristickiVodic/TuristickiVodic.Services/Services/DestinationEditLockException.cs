using System;
using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public class DestinationEditLockException : InvalidOperationException
    {
        public DestinationEditLockException(DestinationEditLockDto lockState)
            : base(lockState.Message)
        {
            LockState = lockState;
        }

        public DestinationEditLockDto LockState { get; }
    }
}
