def hash(string):
    ans = 0

    for i in range(len(string)):
        # 累加的字符
        add = ord(string[i])

        # 不同处理
        if add % 3 == 0:
            ans += add * (i + 1) * 7
        elif add % 2 == 1:
            ans += add * (i + 1) * 2
        else:
            ans += add * (i + 1) * 5
    
    return ans