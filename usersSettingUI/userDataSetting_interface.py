# @make: zhuo-yue-shi
# @date: 2025-1-25
# @desc: 账号管理界面

from PyQt5.QtCore import Qt
from PyQt5.QtGui import QPixmap, QPainter, QColor
from PyQt5.QtWidgets import QWidget, QTableWidgetItem

from uiFile.Ui_userDataSetting import Ui_Form

from simpleHashingAlgorithm.mod import hash
from qfluentwidgets import InfoBar, InfoBarPosition, MessageBox

import json

class UserDataSetting(QWidget, Ui_Form):
    def __init__(self, parent = None):
        super(UserDataSetting, self).__init__(parent = parent)
        self.setupUi(self)

        # 绑定事件
        self.PushButton_PasswordChange.clicked.connect(self.passwordChange)
        self.PrimaryPushButton.clicked.connect(self.addUser)
        self.PushButton_Save.clicked.connect(self.save)
        self.PushButton_Get.clicked.connect(self.load)
        self.PushButton_del.clicked.connect(self.deleteUser)

        self.load()

    def passwordChange(self):
        # 获取密码
        password = self.LineEdit_Password.text()

        # 密码加密
        InfoBar.info(
            title = '密码哈希化结果',
            content = str(hash(password)),
            orient = Qt.Horizontal,
            isClosable = True,
            position = InfoBarPosition.TOP_RIGHT,
            duration = -1,
            parent = self
        )
    
    def addUser(self):
        # 获取数据
        username = self.LineEdit_Username.text()
        password = self.LineEdit_Password.text()

        self.TableWidget.setSelectRightClickedRow(True)

        self.addUserToTable(username, str(hash(password)))

    def addUserToTable(self, username, password):
        # 获取当前行数
        row_count = self.TableWidget.rowCount()

        # 添加一行
        self.TableWidget.insertRow(row_count)

        # 设置单元格内容
        self.TableWidget.setItem(row_count, 0, QTableWidgetItem(username))
        self.TableWidget.setItem(row_count, 1, QTableWidgetItem(password))

    def save(self):
        data = []
        for row in range(self.TableWidget.rowCount()):
            username = self.TableWidget.item(row, 0).text()
            password = self.TableWidget.item(row, 1).text()
            data.append({"username": username, "password": int(password)})

        # 将数据写入 users.json 文件
        with open('data/users.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

        # 显示保存成功的提示
        InfoBar.success(
            title = '保存成功',
            content = '用户数据已成功保存到 users.json 文件中。',
            orient = Qt.Horizontal,
            isClosable = True,
            position = InfoBarPosition.TOP_RIGHT,
            duration = 3000,
            parent = self
        )
    
    def load(self):
        try:
            # 清空现有数据
            self.TableWidget.setRowCount(0)

            # 读取 users.json 文件
            with open('data/users.json', 'r', encoding='utf-8') as f:
                data = json.load(f)

            # 将数据加载到 TableWidget
            for user in data:
                username = user.get("username", "")
                password = user.get("password", "")
                self.addUserToTable(username, str(password))

            # 显示加载成功的提示
            InfoBar.success(
                title='加载成功',
                content='用户数据已成功加载到表格中。',
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP_RIGHT,
                duration=3000,
                parent=self
            )
        except FileNotFoundError:
            # 文件不存在时显示提示
            InfoBar.warning(
                title='文件未找到',
                content='users.json 文件未找到。',
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP_RIGHT,
                duration=3000,
                parent=self
            )
        except json.JSONDecodeError:
            # JSON 解析错误时显示提示
            InfoBar.error(
                title='JSON 解析错误',
                content='users.json 文件格式错误。',
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP_RIGHT,
                duration=3000,
                parent=self
            )
        except Exception as e:
            # 其他错误时显示提示
            InfoBar.error(
                title='加载失败',
                content=f'加载用户数据时发生错误: {str(e)}',
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP_RIGHT,
                duration=3000,
                parent=self
            )
    
    def deleteUser(self):
        # 获取选中的行
        selected_ranges = self.TableWidget.selectedRanges()
        if not selected_ranges:
            InfoBar.warning(
                title='未选中行',
                content='请先选中要删除的行。',
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP_RIGHT,
                duration=3000,
                parent=self
            )
            return

        # 确认对话框
        reply = MessageBox(
            title='确认删除',
            content='确定要删除选中的用户吗？',
            parent=self
        )

        if not reply.exec():
            return

        # 删除选中的行
        for selected_range in selected_ranges:
            top_row = selected_range.topRow()
            bottom_row = selected_range.bottomRow()
            for row in range(bottom_row, top_row - 1, -1):
                self.TableWidget.removeRow(row)

        # 显示删除成功的提示
        InfoBar.success(
            title='删除成功',
            content='选中的用户已成功删除。',
            orient=Qt.Horizontal,
            isClosable=True,
            position=InfoBarPosition.TOP_RIGHT,
            duration=3000,
            parent=self
        )


