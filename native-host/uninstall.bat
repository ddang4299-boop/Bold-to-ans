@echo off
reg delete "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.moodle.quizhelper" /f >nul 2>nul
reg delete "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.moodle.quizhelper" /f >nul 2>nul
echo Da go cai dat.
pause
