# @make: zhuo-yue-shi
# @date: 2025-1-25
# @desc: 账号管理

# 导入模块
import sys

from PyQt5.QtCore import Qt
from PyQt5.QtGui import QIcon
from PyQt5.QtWidgets import QApplication, QWidget

from qfluentwidgets import FluentIcon, MSFluentWindow

from userDataSetting_interface import UserDataSetting
from gitSubmitClone_interface import GitSubmitClone

# 窗口类
class Window(MSFluentWindow):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("账号管理")
        # self.setWindowIcon(QIcon("./resource/img/icon.png"))

        # 子页面
        self.userDataSetting = UserDataSetting()
        self.addSubInterface(self.userDataSetting, FluentIcon.SETTING, "账号管理")
        self.gitsubmitclone = GitSubmitClone()
        self.addSubInterface(self.gitsubmitclone, FluentIcon.GITHUB, "GITHUB操作")

# 主函数
if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = Window()
    window.show()
    sys.exit(app.exec_())