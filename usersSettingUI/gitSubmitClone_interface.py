# @make: zhuo-yue-shi
# @date: 2025-1-25
# @desc: 账号管理界面

from PyQt5.QtCore import Qt
from PyQt5.QtGui import QPixmap, QPainter, QColor
from PyQt5.QtWidgets import QWidget

from uiFile.Ui_userDataSetting import Ui_Form

from simpleHashingAlgorithm.mod import hash
from qfluentwidgets import InfoBar, InfoBarPosition, MessageBox

class GitSubmitClone(QWidget, Ui_Form):
    def __init__(self, parent = None):
        super(GitSubmitClone, self).__init__(parent = parent)
        self.setupUi(self)