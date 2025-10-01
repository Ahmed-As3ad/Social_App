
const endPoint: { [key: string]: string } = {
    profile: '/profile',
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
    // changePassword: '/change-password'
}
export default endPoint;