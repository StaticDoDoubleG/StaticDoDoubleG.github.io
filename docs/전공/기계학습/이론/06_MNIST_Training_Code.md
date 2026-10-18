# MNIST 학습 코드

## 1. 데이터 준비
MNIST는 28×28 grayscale 이미지, 10개 숫자 클래스, train 60,000장과 test 10,000장으로 구성된다. `ToTensor()`로 tensor와 0~1 스케일을 만들고, 평균과 표준편차로 normalize할 수 있다. train loader는 `shuffle=True`, test loader는 `shuffle=False`가 기본적인 설정이다.

## 2. 모델
```python
model = nn.Sequential(
    nn.Flatten(),
    nn.Linear(784, 512), nn.ReLU(),
    nn.Linear(512, 128), nn.ReLU(),
    nn.Linear(128, 32), nn.ReLU(),
    nn.Linear(32, 10),
).to(device)
```
마지막 10은 클래스 수다. 출력은 softmax 이전 logits다.

## 3. 학습·평가
```python
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.SGD(model.parameters(), lr=0.01)
for images, labels in train_loader:
    images, labels = images.to(device), labels.to(device)
    optimizer.zero_grad()
    logits = model(images)
    loss = criterion(logits, labels)
    loss.backward()
    optimizer.step()

model.eval()
with torch.no_grad():
    predicted = model(images).argmax(dim=1)
```
평가 후 다시 학습하려면 `model.train()`을 호출한다. 마지막 batch loss 하나보다 전체 test accuracy와 epoch별 추세를 본다.

## 4. 성능을 바꾸는 요인
은닉 차원, batch size, learning rate, epoch, 활성화 함수가 함께 작용한다. 작은 은닉층은 표현력이 부족하고 큰 learning rate는 불안정할 수 있다. Sigmoid를 깊은 hidden layer에 무분별하게 쓰면 기울기 소실로 성능이 낮아질 수 있다.

## 5. 한 batch의 shape 추적

batch size가 32이면 입력은 `(32,1,28,28)`, Flatten 뒤는 `(32,784)`, 첫 Linear 뒤는 `(32,512)`, 마지막 출력은 `(32,10)`이다. label은 `(32,)`이며 각 값은 0~9의 정수다. 이 shape 추적을 적어 두면 `mat1 and mat2 shapes cannot be multiplied`와 같은 오류의 원인을 층별로 찾을 수 있다.

## 6. 평가 누적 코드

```python
correct = 0
total = 0
model.eval()
with torch.no_grad():
    for images, labels in test_loader:
        logits = model(images.to(device))
        predicted = logits.argmax(dim=1)
        correct += (predicted == labels.to(device)).sum().item()
        total += labels.size(0)
accuracy = correct / total
```

마지막 batch의 loss를 전체 test 성능으로 기록하지 않는다. batch마다 샘플 수가 같지 않을 수 있고, 마지막 batch 하나의 난이도에 결과가 좌우될 수 있다. 전체 샘플의 correct와 total을 누적해 accuracy를 계산한다.

## 7. 학습 결과 기록 항목

모델 구조만 저장하면 재현이 부족하다. `epochs`, `batch_size`, `learning_rate`, optimizer, 초기화, transform의 normalize 값, train/test split, device를 함께 기록한다. 같은 architecture라도 batch size와 learning rate 조합이 달라지면 update의 크기와 횟수가 달라진다.
