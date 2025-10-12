
const endPoint: { [key: string]: string } = {
    profile: '/profile',
    dashboard: '/dashboard',
    changeRole: '/:userId/change-role',
    logout: '/logout',
    // resendOtp: '/resend-otp',
    // forgotPassword: '/forgot-password',
    resetPasswordCode: '/reset-password-code',
    resetPassword: '/reset-password',
    uploadAvatar: '/upload-avatar',
    uploadCovers: '/upload-covers',
    getPreSignedUrl: '/get-presigned-url',
    getFileStream: '/get-file-stream',
    freezeAccount: '{/:userId}/freeze',
    unfreezeAccount: '/:userId/unfreeze',
    deleteAccount: '{/:userId}/delete',
    sendRequest: '/:toUserId/send-friend-request',
    acceptRequest: '/:requestId/accept-friend-request',
    rejectRequest: '/:requestId/reject-friend-request',
    removeFriend: '/:friendId/remove-friend',
    // changePassword: '/change-password'
}
export default endPoint;