using System;
using TuristickiVodic.Core.DTO;

namespace TuristickiVodic.Services.Services
{
    public class UserEditLockException : InvalidOperationException
    {
        public UserEditLockException(UserEditLockDto lockState)
            : base(lockState.Message)
        {
            LockState = lockState;
        }

        public UserEditLockDto LockState { get; }
    }
}
